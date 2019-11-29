'use strict';
const config = require('./config');
const request = require('request');
const gauss = require('gauss');
const ccxt = require ('ccxt');
const bitflyer = new ccxt.bitflyer (config);

const interval = 60000;
const orderSize = 0.01;
const profitRatio = 0.0016;
const lossRatio  = -0.0008;
const chkPriceCount = 5;
let records = [];
let orderInfo = null;

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

(async function () {
  const json = await getCryptowatch();
  let list = json.result[periods];
  let closePrice = list.map(entry => entry[4]);
  records = closePrice.splice(closePrice.length - longMA, closePrice.length);

  while (true){
    console.log('================');
    let nowTime = new Date();
    console.log('time:', nowTime.toLocaleString('ja-JP',{ hour12: false }));

    const ticker = await bitflyer.fetchTicker ('FX_BTC_JPY');
    records.push(ticker.ask);
    if (records.length > longMA){
      records.shift()
    }
    console.log('records:', records);

    const prices = new gauss.Vector(records);
    let shortValue = prices.ema(shortMA).pop();
    let longValue = prices.ema(longMA).pop();
    console.log('shortMA:',shortValue);
    console.log('longMA :',longValue);

    let countHigh = 0;
    for (let i=chkPriceCount; i>0; i--) {
      let before = records[records.length -i -1];
      let after = records[records.length -i];
      // console.log(i);
      // console.log('before:',before);
      // console.log('after :',after);

      if (before <= after){
        countHigh += 1;
        // console.log("high");
      }
    }
    console.log('countHigh:', countHigh);

    //スワップポイント対応 23:55-0:05
    let nowHour = nowTime.getHours();
    let nowMinute = nowTime.getMinutes();
    if ((nowHour === 23 && nowMinute >= 55) || (nowHour === 0 && nowMinute <= 5)){
      console.log(' ');
      console.log('スワップポイント対応中_23:55-0:05');
      //買建玉を成行で売る、注文を受け付けない
      if (orderInfo) {
        const order = await bitflyer.createMarketSellOrder ('FX_BTC_JPY', orderSize);
        orderInfo = null;
        console.log('スワップ対応で成行売り:', order);
      }

      //  whileの先頭に
      console.log(' ');
      await sleep(interval);
      continue;
    }

    if (orderInfo) {
      console.log('latest price:', ticker.bid);
      console.log('order price: ', orderInfo.price);
      console.log('diff: ', ticker.bid - orderInfo.price);
      console.log('ratio: ', ticker.bid / orderInfo.price -1);

      //売り注文:4/5下落or デッドクロスなら即売る
      if (countHigh < 2 || shortValue < longValue){
        const order = await bitflyer.createMarketSellOrder ('FX_BTC_JPY', orderSize);
        orderInfo = null;
        console.log('下落兆候が強いため売り:', order);

      }else {
      //  利確、ロスカット
        if (ticker.bid - orderInfo.price > orderInfo.price * profitRatio) {
          const order = await bitflyer.createMarketSellOrder ('FX_BTC_JPY', orderSize);
          orderInfo = null;
          console.log('利確!:', order);

        } else if (ticker.bid - orderInfo.price < orderInfo.price * lossRatio) {
          const order = await bitflyer.createMarketSellOrder ('FX_BTC_JPY', orderSize);
          orderInfo = null;
          console.log('ロスカット:', order);
        }
      }

    } else {
      /*
      買い注文判断
       ローソク足が陽線が多く、かつゴールデンクロスしている
      */
      if (countHigh > 2 && shortValue > longValue){
        const order = await bitflyer.createMarketBuyOrder ('FX_BTC_JPY', orderSize);
        orderInfo = {
          order: order,
          price: ticker.ask
        };
        console.log('買い注文しました:', orderInfo);
      }
    }

    await sleep(interval);
  }

}) ();
