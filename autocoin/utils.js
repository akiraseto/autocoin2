module.exports = class Utils {

  constructor() {
  }

  static sleep(timer) {
    return new Promise((resolve, reject) => {
      setTimeout(()=>{
        resolve()
      }, timer)
    })
  };

}
