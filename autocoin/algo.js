const gauss = require('gauss');


module.exports = class Algo {

  constructor(records, shortMA, longMA, chkPriceCount) {

    this.records = records;

    //移動平均作成
    const prices = new gauss.Vector(this.records);
    this.shortValue = prices.ema(shortMA).pop();
    this.longValue = prices.ema(longMA).pop();

    //各アルゴリズムの重み付け
    this.algoWeight = {
      'bullAlgo': 1,
      'crossAlgo': 1
    }

    // 各アルゴリズムの評価ポイント
    this.eva = {
      'bullAlgo': 0,
      'crossAlgo': 0
    };

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
    //正数がbuy判断、負数がsell判断
    this.bullRatio = countHigh / this.chkPriceCount;

    if (this.bullRatio >= buy_ratio) {
      this.eva['bullAlgo'] = 1;
    } else if (this.bullRatio <= sell_ratio) {
      this.eva['bullAlgo'] = -1;
    }
  }


  crossAlgo() {
    //ゴールデン・デッドクロスで売買を判断する
    if (this.shortValue >= this.longValue) {
      this.eva['crossAlgo'] = 1;
    } else if (this.shortValue < this.longValue) {
      this.eva['crossAlgo'] = -1;
    }
  }

  tradeAlgo(algo) {
    //  重み付けして総合的な売買判断

    let totalEva = 0

    algo.forEach((value) => {
      let name = value + 'Algo';
      totalEva += this.eva[name] * this.algoWeight[name]
      //評価値を初期化
      this.eva[name] = 0;
    })

    return totalEva
  }


}



