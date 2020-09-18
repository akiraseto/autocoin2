const gauss = require('gauss');

module.exports = class Algo {

  constructor(records) {
    this.records = records;

    // 各アルゴリズムの評価ポイント
    //上昇シグナル:+  下降シグナル:-
    this.eva = {
      'psychoAlgo': 0,
      'crossAlgo': 0,
      'bollingerAlgo': 0
    };
  }

  psychoAlgo(range, ratio, list = this.records) {
    //  陽線の割合で売買を判断する

    let countHigh = 0
    //  任意期間の陽線回数をカウント
    for (let i = range; i > 0; i--) {
      const before = list[list.length - i - 1];
      const after = list[list.length - i];

      if (before <= after) {
        countHigh += 1;
      }
    }

    let psychoRatio = 0;
    psychoRatio = countHigh / range;
    if (psychoRatio >= ratio) {
      this.eva['psychoAlgo'] = 1;
    } else if (psychoRatio <= 1 - ratio) {
      this.eva['psychoAlgo'] = -1;
    }

    return psychoRatio;
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


  bollingerAlgo(period, sigma, price = this.records.slice(-1)[0], list = this.records) {
    //  ボリンジャーバンド

    const prices = new gauss.Vector(list.slice(-period));
    //SMA使用
    const sma = prices.sma(period).pop();
    const stdev = prices.stdev()

    const upper = Math.round(sma + stdev * sigma);
    const lower = Math.round(sma - stdev * sigma);

    if (price <= lower) {
      this.eva['bollingerAlgo'] = 1;
    } else if (price >= upper) {
      this.eva['bollingerAlgo'] = -1;
    }

    return {'upper': upper, 'lower': lower}
  }


  tradeAlgo(weight) {
    //  重み付けして総合的な取引判断

    let totalEva = 0
    //評価ポイントにそれぞれの重みを掛けて足し合わせる
    for (const [key, value] of Object.entries(this.eva)) {
      totalEva += value * weight[key];
    }

    totalEva = Math.round(totalEva * 100) / 100

    return totalEva
  }


  initEva() {
    //全評価ポイントを初期化
    Object.keys(this.eva).forEach(key => {
      this.eva[key] = 0;
    });
  }


}
