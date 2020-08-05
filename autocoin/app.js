'use strict';
const config = require('./config');
const request = require('request');
const moment = require('moment');
const gauss = require('gauss');
const ccxt = require ('ccxt');
const bitflyer = new ccxt.bitflyer (config);

const mongo_class = require('./mongo');
const mongo = new mongo_class();
const line_class = require('./line');
const line = new line_class()

const algo = require('./algo');

//Ratioは変更の可能性あり
const profitRatio = 0.0005;
const lossRatio = -0.001;
const orderSize = 0.01;
const chkPriceCount = 5;
const interval = 60000;

//lineNotifyの設定
const alertUnit = 10;

//cryptowatchの設定
const markets = 'bitflyer';
const instrument = 'btcfxjpy';
//取引間隔
const periods = 60;
//移動平均間隔(分)
const shortMA = 5;
const longMA = 30;

const beforeHour = longMA * 60;
const timeStamp = moment().unix() - beforeHour;
const uri = `https://api.cryptowat.ch/markets/${markets}/${instrument}/ohlc?periods=${periods}&after=${timeStamp}`;

//起動時cryptowatchから値取得
const getCryptowatch = () => {
  return new Promise((resolve) => {
    request(uri,(err, response, body) => {
      resolve(JSON.parse(body))
    });
  })
};

//タイマー
const sleep = (timer) => {
  return new Promise((resolve, reject) => {
    setTimeout(()=>{
      resolve()
    }, timer)
  })
};

(async function () {
  let sumProfit = 0;
  let baseProfit = null;
  let orderInfo = null;
  let tradeLog = null;
  const json = await getCryptowatch();
  let list = json.result[periods];
  let closePrice = list.map(entry => entry[4]);
  let records = closePrice.splice(closePrice.length - longMA, closePrice.length);

  //Lineに自動売買スタートを通知
  const nowTime = moment();
  const strTime = nowTime.format('YYYY/MM/DD HH:mm:ss');
  const collateral = await bitflyer.fetch2('getcollateral', 'private', 'GET');
  const message = `\n 自動売買スタート\n date: ${strTime}\n collateral: ${collateral.collateral}`;
  line.notify(message);

  while (true) {
    console.log('================');
    let order = null;
    let flag = null;
    let label = "";
    let priceDiff = null;
    let ratio = null;
    let profit = 0;
    const nowTime = moment();
    const strTime = nowTime.format('YYYY/MM/DD HH:mm:ss');
    console.log('time:', strTime);

    //取引所の稼働状況を確認
    let health = await bitflyer.fetch2('getboardstate');
    if (health.state !== 'RUNNING') {
      // 以上ならwhileの先頭に
      console.log('取引所の稼働状況:', health);
      await sleep(interval);
      continue;
    }

    const ticker = await bitflyer.fetchTicker ('FX_BTC_JPY');
    records.push(ticker.ask);
    if (records.length > longMA){
      records.shift()
    }

    const prices = new gauss.Vector(records);
    const shortValue = prices.ema(shortMA).pop();
    const longValue = prices.ema(longMA).pop();

    let countHigh = 0;
    for (let i=chkPriceCount; i>0; i--) {
      const before = records[records.length -i -1];
      const after = records[records.length -i];

      if (before <= after){
        countHigh += 1;
      }
    }

    //スワップポイント対応 23:55-0:05
    const nowHour = nowTime.hours();
    const nowMinute = nowTime.minute();
    if ((nowHour === 23 && nowMinute >= 55) || (nowHour === 0 && nowMinute <= 5)){
      console.log(' ');
      console.log('スワップポイント対応中_23:55-0:05');
      //買建玉を成行で売る、注文を受け付けない
      if (orderInfo) {
        order = await bitflyer.createMarketSellOrder ('FX_BTC_JPY', orderSize);
        profit = Math.round((ticker.bid - orderInfo.price) * orderSize * 10) / 10;
        sumProfit += profit;
        orderInfo = null;
        flag = 'sell';
        label = 'スワップ対応で成行売り';
      }

      //  whileの先頭に
      console.log(' ');
      await sleep(interval);
      continue;
    }

    if (orderInfo) {
      priceDiff = ticker.bid - orderInfo.price;
      ratio = ticker.bid / orderInfo.price - 1;
      profit = Math.round((ticker.bid - orderInfo.price) * orderSize * 10) / 10;
      console.log('latest price:', ticker.bid);
      console.log('order price: ', orderInfo.price);
      console.log('diff: ', priceDiff);
      console.log('ratio: ', ratio);
      console.log('profit:', profit);

      //売り注文:陰線が多い or デッドクロスなら即売る
      if (countHigh <= 1 || shortValue < longValue) {
        order = await bitflyer.createMarketSellOrder('FX_BTC_JPY', orderSize);
        sumProfit += profit;
        orderInfo = null;
        flag = 'sell';
        label = '下落兆候が強いため売り';

      } else {
        //  利確、ロスカット
        if (ticker.bid - orderInfo.price > orderInfo.price * profitRatio) {
          order = await bitflyer.createMarketSellOrder('FX_BTC_JPY', orderSize);
          sumProfit += profit;
          orderInfo = null;
          flag = 'sell';
          label = '利確';

        } else if (ticker.bid - orderInfo.price < orderInfo.price * lossRatio) {
          order = await bitflyer.createMarketSellOrder ('FX_BTC_JPY', orderSize);
          sumProfit += profit;
          orderInfo = null;
          flag = 'sell';
          label = 'ロスカット';
        }
      }

    } else {
      /*
      買い注文判断
       ローソク足が陽線が多く、かつゴールデンクロス
      */
      if (countHigh >= 3 && shortValue > longValue) {
        order = await bitflyer.createMarketBuyOrder('FX_BTC_JPY', orderSize);
        orderInfo = {
          order: order,
          price: ticker.ask
        };
        flag = 'buy';
        label = '買い注文';
      }
    }

    const collateral = await bitflyer.fetch2('getcollateral','private', 'GET');
    sumProfit = Math.round(sumProfit * 10) / 10;
    console.log('sum profit:', sumProfit);
    console.log('collateral:',collateral.collateral );

    //売買したならmongoに記録する
    if (flag === 'buy' || flag === 'sell'){

      if(flag === 'buy') {
        tradeLog = {
          flag: flag,
          label: label,
          created_at: nowTime._d,
          strTime: strTime,
          price: orderInfo.price,
          shortMA: shortValue,
          longMA: longValue,
          countHigh: countHigh,
          records: records
        };
      }else if(flag === 'sell'){
        tradeLog = {
          flag: flag,
          label: label,
          created_at: nowTime._d,
          strTime: strTime,
          price: ticker.bid,
          shortMA: shortValue,
          longMA: longValue,
          countHigh: countHigh,
          records: records,
          profitRatio: profitRatio,
          lossRatio: lossRatio,
          diff: priceDiff,
          ratio: ratio,
          profit: profit,
          sumProfit: sumProfit,
          collateral: collateral.collateral
        };
      }

      mongo.insert(tradeLog);

      console.log('');
      console.log('tradeLog:',tradeLog);
      console.log('order:',order);
      tradeLog = null;

    } else {
    //  売買じゃないときに表示
      console.log('records:', records);
      console.log('shortMA:',shortValue);
      console.log('longMA :',longValue);
      console.log('countHigh:', countHigh);
    }

    // LineNotifyに通知(設定閾値を超えたら)
    if (baseProfit !== null){
      if (flag === 'sell') {
        //sell済みなのでsumProfitと被るprofitを初期化
        profit = 0;
      }
      const diff = Math.abs(sumProfit - baseProfit + profit);
      if(diff >= alertUnit) {
        const message = `\n date: ${strTime}\n sumProfit: ${sumProfit}\n profit: ${profit}\n collateral: ${collateral.collateral}`;

        line.notify(message);
        baseProfit = sumProfit;
      }
    }else{
      //アラート初期化
      baseProfit = sumProfit;
    }

    await sleep(interval);
  }

}) ();
