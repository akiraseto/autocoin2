const gauss = require('gauss');


module.exports = class Algo {

  constructor(records, shortMA, longMA, chkPriceCount) {

    this.records = records;

    //移動平均作成
    const prices = new gauss.Vector(this.records);
    this.shortValue = prices.ema(shortMA).pop();
    this.longValue = prices.ema(longMA).pop();

    //陽線カウントの範囲
    this.chkPriceCount = chkPriceCount
    this.bullRatio = null;

  }


  chkHigh() {
    let countHigh = 0
    //  任意期間の陽線回数をカウント
    for (let i = this.chkPriceCount; i > 0; i--) {
      const before = this.records[this.records.length - i - 1];
      const after = this.records[this.records.length - i];

      if (before <= after) {
        countHigh += 1;
      }
    }

    return countHigh;
  }


  bullAlgo(buy_ratio = 0.6, sell_ratio = 0.2) {
    //  陽線の割合で売買を判断する
    const countHigh = this.chkHigh()
    let res = null;
    this.bullRatio = countHigh / this.chkPriceCount;

    if (this.bullRatio >= buy_ratio) {
      res = 'buy';
    } else if (this.bullRatio <= sell_ratio) {
      res = 'sell';
    }
    return res;
  }


  crossAlgo() {
    //ゴールデン・デッドクロスで売買を判断する
    let res = null;
    if (this.shortValue <= this.longValue) {
      res = 'sell';
    } else if (this.shortValue > this.longValue) {
      res = 'buy';
    }


  }

  //todo:重み付けで売買判断させる
  //todo:正数がbuy判断、負数がsell判断
  tradeAlgo() {
    //  総合的な売買判断


  }


}



