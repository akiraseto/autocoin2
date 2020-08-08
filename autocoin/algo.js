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

    const bull_ratio = countHigh / this.chkPriceCount;

    if (bull_ratio >= buy_ratio) {
      res = 'buy';
    } else if (bull_ratio <= sell_ratio) {
      res = 'sell';
    }
    return res;
  }


  //todo:ゴールデン・デッドクロス判断

//todo:重み付けで売買判断させる
//  todo:正数がbuy判断、負数がsell判断


}



