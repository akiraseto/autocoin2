'use strict';
const ccxt = require ('ccxt');
const config = require('./config');
const bitflyer = new ccxt.bitflyer (config);

(async function () {
  // console.log (bitflyer.id,    await bitflyer.loadMarkets ());

  // console.log (bitflyer.id,  await bitflyer.fetchTicker ('FX_BTC_JPY'));

  //資産情報
  // console.log (bitflyer.id, await bitflyer.fetchBalance ())

  //全取引情報
  // console.log (bitflyer.id, await bitflyer.fetchMyTrades('FX_BTC_JPY'));

  //FX/Futures 証拠金変動履歴
  // console.log (bitflyer.id, await bitflyer.fetch2('getcollateralhistory','private', 'GET'));

  //FX/Futures 証拠金
  // console.log (bitflyer.id, await bitflyer.fetch2('getcollateral','private', 'GET'));

  //値段取得
  // console.log (bitflyer.id, await bitflyer.fetchTicker ('FX_BTC_JPY'));

  //状態確認
  console.log (bitflyer.id, await bitflyer.fetch2('getboardstate'));


  //銀行口座
  // console.log (bitflyer.id, await bitflyer.fetch2('getbankaccounts','private', 'GET'));

  // sell 1 BTC/USD for market price, sell a bitcoin for dollars immediately
  // console.log (bitflyer.id, await bitflyer.createMarketBuyOrder ('FX_BTC_JPY', 0.01));

  // console.log (bitflyer.id, await bitflyer.createMarketSellOrder ('FX_BTC_JPY', 0.01));

  // console.log (bitflyer.id, await bitflyer.createLimitBuyOrder ('FX_BTC_JPY', 0.01, 986000));

  // buy 1 BTC/USD for $2500, you pay $2500 and receive ฿1 when the order is closed
  // console.log (bitflyer.id, await bitflyer.createLimitBuyOrder ('FX_BTC/USD', 0.01, 2500.00))

  // pass/redefine custom exchange-specific order params: type, amount, price or whatever
  // use a custom order type
  // bitflyer.createLimitSellOrder ('BTC/USD', 1, 10, { 'type': 'trailing-stop' })

}) ();

