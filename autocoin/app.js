'use strict';
const config = require('./config');
const moment = require('moment');
const ccxt = require ('ccxt');
const bitflyer = new ccxt.bitflyer(config);

const Crypto = require('./crypto')
const Mongo = require('./mongo');
const mongo = new Mongo();
const Line = require('./line');
const line = new Line(config.line_token)
const utils = require('./utils');
const Algo = require('./algo');

const orderSize = 0.01;
//取引間隔(秒)
const tradeInterval = 60;
//swap日数
const swapDays = 3;
//通知用の価格差閾値
const infoThreshold = 30;

//bullAlgoの設定値;陽線カウント
const bullParam = {
  'range': 10,
  'ratio': 0.7,
};
//crossAlgoの設定値:移動平均幅
const crossParam = {
  'shortMA': 5,
  'longMA': 30,
};

//ボリンジャーバンド設定値
const BBOrder = {
  //注文
  'period': 10,
  'sigma': 2
};
const BBProfit = {
  //利確
  'period': 15,
  'sigma': 1.7
};
const BBLossCut = {
  //損切り
  //recordはdayで入力
  'period': 5,
  'sigma': 2
};

// アルゴリズムの重み付け:未使用は0にする
const algoWeight = {
  // 'bullAlgo': 0,
  // 'crossAlgo': 0,
  // 'bollingerAlgo': 1,
  'bullAlgo': 0.1,
  'crossAlgo': 0.2,
  'bollingerAlgo': 0.7,
};
//取引判断の閾値
const algoThreshold = 0.3;


(async function () {
  let sumProfit = 0;
  let beforeProfit = null;
  const nowTime = moment();
  const collateral = await bitflyer.fetch2('getcollateral', 'private', 'GET');

  //(分)レコード作成
  const crypto = new Crypto();
  const beforeHour = crossParam.longMA * 60;
  const timeStamp = nowTime.unix() - beforeHour;
  let records = await crypto.getOhlc(tradeInterval, timeStamp);

  const algo = new Algo(records);

  //Lineに自動売買スタートを通知
  const strTime = nowTime.format('YYYY/MM/DD HH:mm:ss');
  const message = `\n 自動売買スタート\n date: ${strTime}\n collateral: ${collateral.collateral}`;
  line.notify(message);


  while (true) {
    let flag = null;
    let label = "";
    let tradeLog = null;

    const nowTime = moment();
    const strTime = nowTime.format('YYYY/MM/DD HH:mm:ss');

    //取引所の稼働状況を確認
    let health = await bitflyer.fetch2('getboardstate');
    if (health.state !== 'RUNNING') {
      // 異常ならwhileの先頭に
      console.log('取引所の稼働状況:', health);
      await utils.sleep(tradeInterval * 1000);
      continue;
    }

    //現在価格を取得
    const ticker = await bitflyer.fetchTicker('FX_BTC_JPY');
    const nowPrice = ticker.close;

    //レコードを更新
    algo.records.push(nowPrice);
    algo.records.shift()

    //アルゴリズム用Paramを初期化
    let bbRes = null;
    let totalEva = 0;
    algo.initEva();
    //共通アルゴリズム
    const crossRes = algo.crossAlgo(crossParam.shortMA, crossParam.longMA);
    const bullRes = algo.bullAlgo(bullParam.range, bullParam.ratio)

    //建玉を調べる
    const jsonOpenI = await bitflyer.fetch2('getpositions', 'private', 'GET', {product_code: "FX_BTC_JPY"});
    const openI = utils.chkOpenI(jsonOpenI)

    //共通表示
    console.log('================');
    console.log('time:', strTime);
    console.log('nowPrice: ', nowPrice);


    // 建玉がある場合
    if (openI.side) {
      //建玉の共通表示
      console.log('');
      console.log('建玉内容');
      console.log(openI);

      let diffDays = nowTime.diff(openI.open_date, 'days');
      // swap日数を超えているなら
      if (diffDays >= swapDays) {
        // 建玉を0に戻す
        label = 'swap日数を超えているため建玉をリセット'

        if (openI.side === 'BUY') {
          await bitflyer.createMarketSellOrder('FX_BTC_JPY', openI.size);
          flag = 'SELL';

        } else {
          await bitflyer.createMarketBuyOrder('FX_BTC_JPY', openI.size);
          flag = 'BUY';
        }
        sumProfit += openI.pnl;

      } else {
        // 日数を超えてないなら
        //  利益が出ている場合
        if (openI.pnl > 0) {
          label = '利確'
          bbRes = algo.bollingerAlgo(BBProfit.period, BBProfit.sigma);
          totalEva = algo.tradeAlgo(algoWeight)

          //買い建玉で、下降シグナルが出ている
          if (openI.side === 'BUY' && totalEva < -algoThreshold) {
            await bitflyer.createMarketSellOrder('FX_BTC_JPY', openI.size);
            sumProfit += openI.pnl;
            flag = 'SELL';

            //売り建玉で、上昇シグナルが出ている
          } else if (openI.side === 'SELL' && totalEva > algoThreshold) {
            await bitflyer.createMarketBuyOrder('FX_BTC_JPY', openI.size);
            sumProfit += openI.pnl;
            flag = 'BUY';

          }
        } else {
          //  損してる場合
          //ボリンジャーのみで判断
          //他のアルゴリズムは短いスパンで一過性判断のため除外
          label = 'ロスカット';

          //日にちベースのボリンジャー作成
          const dayPeriods = 60 * 60 * 24;
          const lossTimeStamp = nowTime.unix() - dayPeriods * BBLossCut.period;
          let dayRecords = await crypto.getOhlc(dayPeriods, lossTimeStamp);
          bbRes = algo.bollingerAlgo(BBLossCut.period, BBLossCut.sigma, dayRecords);

          //損してるのにデイリーローワーバンドを下回っている(大きなトレンドが下がり兆候)
          if (openI.side === 'BUY' && nowPrice <= bbRes.lower) {
            await bitflyer.createMarketSellOrder('FX_BTC_JPY', openI.size);
            sumProfit += openI.pnl;
            flag = 'SELL';

            //損してるのにデイリーアッパーバンドを超えている(大きなトレンドで上がり兆候)
          } else if (openI.side === 'SELL' && nowPrice >= bbRes.upper) {
            await bitflyer.createMarketBuyOrder('FX_BTC_JPY', openI.size);
            sumProfit += openI.pnl;
            flag = 'BUY';
          }
        }
      }

      //建玉を精算したなら、
      if (flag) {
        tradeLog = {
          flag: flag,
          label: label,
          sumProfit: sumProfit,
          profit: openI.pnl,
          nowPrice: nowPrice,
          openPrice: openI.price,
          strTime: strTime,
          created_at: nowTime._d,
          openI: openI,
          bollinger: bbRes,
          cross: crossRes,
          bull: bullRes,
          totalEva: totalEva,
        };
        mongo.insert(tradeLog);

        console.log('');
        console.log(label);
        console.log(tradeLog);
      }

      // Line通知(閾値を超えたら)
      if (beforeProfit !== null) {
        const profit = openI.pnl;
        const diff = Math.abs(sumProfit + profit - beforeProfit);
        if (diff >= infoThreshold) {
          const message = `\n date: ${strTime}\n sumProfit: ${sumProfit}\n profit: ${profit}\n collateral: ${collateral.collateral}`;
          line.notify(message);
          beforeProfit = sumProfit + profit;
        }
      } else {
        //アラート初期化
        beforeProfit = sumProfit;
      }


    } else {
      //建玉を持ってない場合

      //スワップポイント対応 23:30-0:00 注文しない
      const limitDay = moment().hours(23).minutes(30).seconds(0)
      if (nowTime.isSameOrAfter(limitDay)) {
        console.log(' ');
        console.log('スワップポイント対応中_23:30-0:00');
        //注文を受け付けない while先頭に移動
        await utils.sleep(tradeInterval * 1000);
        continue;
      }

      // 注文する ボリンジャーを使用
      bbRes = algo.bollingerAlgo(BBOrder.period, BBOrder.sigma);
      totalEva = algo.tradeAlgo(algoWeight)

      if (totalEva > algoThreshold) {
        //【買い】で建玉する
        await bitflyer.createMarketBuyOrder('FX_BTC_JPY', orderSize);
        flag = 'BUY';

      } else if (totalEva < -algoThreshold) {
        //【売り】で建玉する
        await bitflyer.createMarketSellOrder('FX_BTC_JPY', orderSize);
        flag = 'SELL';
      }

      //建玉を取得したなら、
      if (flag) {
        label = '建玉取得';

        tradeLog = {
          flag: flag,
          label: label,
          sumProfit: sumProfit,
          nowPrice: nowPrice,
          bollinger: bbRes,
          cross: crossRes,
          bull: bullRes,
          totalEva: totalEva,
          strTime: strTime,
          created_at: nowTime._d,
        };
        mongo.insert(tradeLog);

        console.log('');
        console.log(label);
        console.log(tradeLog);
      }
    }

    console.log('');
    console.log('★sumProfit: ', sumProfit);
    console.log('');
    await utils.sleep(tradeInterval * 1000);
  }
}) ();
