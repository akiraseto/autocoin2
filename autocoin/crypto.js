const request = require('request');

module.exports = class Crypto {

  constructor() {
    this.markets = 'bitflyer';
    this.instrument = 'btcfxjpy';
  }


  getOhlc(periods, timeStamp) {
    const uri = `https://api.cryptowat.ch/markets/${this.markets}/${this.instrument}/ohlc?periods=${periods}&after=${timeStamp}`;

    return new Promise((resolve) => {
      request(uri, (err, response, body) => {
        const json = JSON.parse(body)
        let list = json.result[periods];

        resolve(list.map(entry => entry[4]))
      });
    })
  };

}
