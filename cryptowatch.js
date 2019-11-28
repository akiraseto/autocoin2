const request = require('request');
const gauss = require('gauss');

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
console.log(uri);

const asyncFunc = () => {
  return new Promise((resolve) => {
    request(uri,(err, response, body) => {
      resolve(JSON.parse(body))
    });
  })
};

async function main() {
  const json = await asyncFunc();
  let list = json.result[periods];
  let closePrice = list.map(entry => entry[4]);
  closePrice = closePrice.splice(closePrice.length - longMA, closePrice.length);
  console.log('closePrice', closePrice);

  const prices = new gauss.Vector(closePrice);
  let longValue = prices.ema(longMA).pop();
  let shortValue = prices.ema(shortMA).pop();

  console.log('longMA: ',longValue);
  console.log('shortMA: ',shortValue);
}

main();
