module.exports = class Utils {

  static sleep(timer) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve()
      }, timer)
    })
  };

  static chkOpenI(json) {
    //建玉情報を取得

    let side = '';
    let price = 0;
    let size = 0;
    let swap_point_accumulate = 0;
    let open_date = '';
    let pnl = 0;

    try {
      json.forEach(value => {
            side = value['side'];
            price += value['price'] * value['size'];
            size += value['size'];
            swap_point_accumulate += value['swap_point_accumulate'];
            open_date = value['open_date'];
            pnl += value['pnl'];
          }
      )
      price = price / size;

      return {
        'side': side,
        'price': Math.floor(price),
        'size': Math.round(size * 1000) / 1000,
        'swap_point_accumulate': swap_point_accumulate,
        'open_date': open_date,
        'pnl': Math.floor(pnl)
      }

    } catch (error) {
      console.error(error);
    }
  };


}
