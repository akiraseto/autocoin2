'use strict';
const config = require('./config');
const request = require('request');
const gauss = require('gauss');
const ccxt = require ('ccxt');
const bitflyer = new ccxt.bitflyer (config);
const MongoClient = require('mongodb').MongoClient;

const interval = 60000;
const orderSize = 0.01;

const profitRatio = 0.0004;
const lossRatio  = -0.0008;
const chkPriceCount = 5;
let records = [];
let orderInfo = null;

// MongoDB設定
const dbOptions = {
  useUnifiedTopology : true,
  useNewUrlParser : true
};
const dbUrl = 'mongodb://localhost:27017';
const dbName = 'autocoin';
const cName = 'btcfx';
let tradeLog = null;

/*
cryptowatchの設定
*/
//市場
const markets = 'bitflyer';
const instrument = 'btcfxjpy';
//取引間隔
const periods = 60;
//移動平均間隔(分)
const shortMA = 5;
const longMA = 30;

const beforeHour = longMA * 60;
const timeStamp = Math.round((new Date()).getTime() / 1000) - beforeHour;
const uri = `https://api.cryptowat.ch/markets/${markets}/${instrument}/ohlc?periods=${periods}&after=${timeStamp}`;

//起動時にcryptowatchから値を取得
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

//MongoDB Create
const insertDocuments = (db, object) => {
  /** collectionを取得 */
  const collection = db.collection(cName);
  /** collectionにdocumentを追加 */
  collection.insertOne(object,
      (err, result) => {
        /** 成功した旨をコンソールに出力 */
        console.log('DBに書き込み');
      }
  );
};

(async function () {
  let sumProfit = 0;
  const json = await getCryptowatch();
  let list = json.result[periods];
  let closePrice = list.map(entry => entry[4]);
  records = closePrice.splice(closePrice.length - longMA, closePrice.length);

  while (true){
    console.log('================');
    let order = null;
    let flag = null;
    let label = "";
    let priceDiff = null;
    let ratio = null;
    let profit = null;
    let nowTime = new Date();
    let strTime = nowTime.toLocaleString('ja-JP',{ hour12: false });
    console.log('time:', strTime);

    //取引所の稼働状況を確認
    let health = await bitflyer.fetch2('getboardstate');
    if (!(health.health === 'NORMAL' || health.health === 'BUSY' || health.health === 'VERY BUSY')) {
      // 以上ならwhileの先頭に
      console.log('取引所の稼働状況:', health.health);
      await sleep(interval);
      continue;
    }

    const ticker = await bitflyer.fetchTicker ('FX_BTC_JPY');
    records.push(ticker.ask);
    if (records.length > longMA){
      records.shift()
    }

    const prices = new gauss.Vector(records);
    let shortValue = prices.ema(shortMA).pop();
    let longValue = prices.ema(longMA).pop();

    let countHigh = 0;
    for (let i=chkPriceCount; i>0; i--) {
      let before = records[records.length -i -1];
      let after = records[records.length -i];

      if (before <= after){
        countHigh += 1;
      }
    }

    //スワップポイント対応 23:55-0:05
    let nowHour = nowTime.getHours();
    let nowMinute = nowTime.getMinutes();
    if ((nowHour === 23 && nowMinute >= 55) || (nowHour === 0 && nowMinute <= 5)){
      console.log(' ');
      console.log('スワップポイント対応中_23:55-0:05');
      //買建玉を成行で売る、注文を受け付けない
      if (orderInfo) {
        order = await bitflyer.createMarketSellOrder ('FX_BTC_JPY', orderSize);
        profit = (ticker.bid - orderInfo.price) * orderSize;
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
      ratio = ticker.bid / orderInfo.price -1;
      profit = (ticker.bid - orderInfo.price) * orderSize;
      console.log('latest price:', ticker.bid);
      console.log('order price: ', orderInfo.price);
      console.log('diff: ', priceDiff);
      console.log('ratio: ', ratio);
      console.log('profit:', profit);

      //売り注文:4/5下落or デッドクロスなら即売る
      if (countHigh < 2 || shortValue < longValue){
        order = await bitflyer.createMarketSellOrder ('FX_BTC_JPY', orderSize);
        sumProfit += profit;
        orderInfo = null;
        flag = 'sell';
        label = '下落兆候が強いため売り';

      }else {
      //  利確、ロスカット
        if (ticker.bid - orderInfo.price > orderInfo.price * profitRatio) {
          order = await bitflyer.createMarketSellOrder ('FX_BTC_JPY', orderSize);
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
       ローソク足が陽線が多く、かつゴールデンクロスしている
      */
      if (countHigh > 2 && shortValue > longValue){
        order = await bitflyer.createMarketBuyOrder ('FX_BTC_JPY', orderSize);
        orderInfo = {
          order: order,
          price: ticker.ask
        };
        flag = 'buy';
        label = '買い注文';
      }
    }

    const collateral = await bitflyer.fetch2('getcollateral','private', 'GET');
    console.log('sum profit:', sumProfit);
    console.log('collateral:',collateral.collateral );

    //売買したならmongoに記録する
    if (flag === 'buy' || flag === 'sell'){

      if(flag === 'buy') {
        tradeLog = {
          flag: flag,
          label: label,
          created_at: nowTime,
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
          created_at: nowTime,
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
      //MongoDB inserted
      let client;

      try {
        client = await MongoClient.connect(
            dbUrl,
            dbOptions,
        );
        const db = client.db(dbName);

        // CRUD関数 awaitで待機させる
        await insertDocuments(db, tradeLog);
      } catch (err) {
        // 接続失敗した場合
        console.log(err.stack);
      }

      client.close();

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
    await sleep(interval);
  }

}) ();
