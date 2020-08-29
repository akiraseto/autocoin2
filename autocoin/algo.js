const gauss = require('gauss');

module.exports = class Algo {

  constructor(records) {
    this.records = records;

    // 各アルゴリズムの評価ポイント
    //上昇シグナル:+  下降シグナル:-
    this.eva = {
      'bullAlgo': 0,
      'crossAlgo': 0,
      'bollingerAlgo': 0
    };
  }


  bullAlgo(chkPriceCount, buy_ratio, sell_ratio, list = this.records) {
    //  陽線の割合で売買を判断する

    let countHigh = 0
    //  任意期間の陽線回数をカウント
    for (let i = chkPriceCount; i > 0; i--) {
      const before = list[list.length - i - 1];
      const after = list[list.length - i];

      if (before <= after) {
        countHigh += 1;
      }
    }

    let bullRatio = 0;
    bullRatio = countHigh / chkPriceCount;
    //正数がbuy判断、負数がsell判断
    if (bullRatio >= buy_ratio) {
      this.eva['bullAlgo'] = 1;
    } else if (bullRatio <= sell_ratio) {
      this.eva['bullAlgo'] = -1;
    }

    return bullRatio;
  }


  crossAlgo(shortMA, longMA, list = this.records) {
    //ゴールデン・デッドクロスで売買を判断する

    //移動平均作成
    const prices = new gauss.Vector(list);
    const shortValue = prices.ema(shortMA).pop();
    const longValue = prices.ema(longMA).pop();

    if (shortValue >= longValue) {
      this.eva['crossAlgo'] = 1;
    } else if (shortValue < longValue) {
      this.eva['crossAlgo'] = -1;
    }

    return {'shortValue': shortValue, 'longValue': longValue};
  }


  bollingerAlgo(period, sigma, list = this.records) {
    //  ボリンジャーバンド

    const prices = new gauss.Vector(list.slice(-period));
    //今回はSMAを使う
    const sma = prices.sma(period).pop();
    const stdev = prices.stdev()

    const upper = Math.round(sma + stdev * sigma);
    const lower = Math.round(sma - stdev * sigma);

    //評価ポイント入れる
    const nowPrice = list.pop();
    if (nowPrice <= lower) {
      this.eva['bollingerAlgo'] = 1;
    } else if (nowPrice >= upper) {
      this.eva['bollingerAlgo'] = -1;
    }

    return {'upper': upper, 'lower': lower}
  }


  tradeAlgo(weight) {
    //  重み付けして総合的な売買判断

    let totalEva = 0
    //評価ポイントにそれぞれの重みを掛けて足し合わせる
    for (const [key, value] of Object.entries(this.eva)) {
      totalEva += value * weight[key];
    }

    return totalEva
  }


  initEva() {
    Object.keys(this.eva).forEach(key => {
      this.eva[key] = 0;
    });
  }


}



