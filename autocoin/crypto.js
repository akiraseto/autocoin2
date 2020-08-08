const request = require('request');

module.exports = class Crypto {

  constructor(periods, timeStamp) {
    this.markets = 'bitflyer';
    this.instrument = 'btcfxjpy';
    //取引間隔
    this.periods = periods;
    //どの時点から取得するか
    this.timeStamp = timeStamp;
  }


  getOhlc() {
    const uri = `https://api.cryptowat.ch/markets/${this.markets}/${this.instrument}/ohlc?periods=${this.periods}&after=${this.timeStamp}`;

    return new Promise((resolve) => {
      request(uri, (err, response, body) => {
        resolve(JSON.parse(body))
      });
    })
  };


  async dumpRecords(longMA) {
    const json = await this.getOhlc();
    let list = json.result[this.periods];
    let closePrice = list.map(entry => entry[4]);
    return closePrice.splice(closePrice.length - longMA, closePrice.length);
  }

}
