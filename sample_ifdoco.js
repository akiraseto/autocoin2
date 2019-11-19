'use strict';
const ccxt = require ('ccxt');
const config = require('./config');
const bitflyer = new ccxt.bitflyer (config);

(async function () {
  let result = await bitflyer.privatePostSendparentorder ({
    "order_method": "IFDOCO",
    "minute_to_expire": 10000,
    "time_in_force": "GTC",
    "parameters": [{
      "product_code": "FX_BTC_JPY",
      "condition_type": "LIMIT",
      "side": "BUY",
      "price": 985000,
      "size": 0.01
    },
      {
        "product_code": "FX_BTC_JPY",
        "condition_type": "LIMIT",
        "side": "SELL",
        "price": 985500,
        "size": 0.01
      },
      {
        "product_code": "FX_BTC_JPY",
        "condition_type": "STOP",
        "side": "SELL",
        "trigger_price": 984500,
        "size": 0.01
      }]
  });

}) ();

