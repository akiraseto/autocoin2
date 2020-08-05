const request = require('request');
const config = require('./config');

module.exports = class Line {

  constructor() {
    this.linUri = 'https://notify-api.line.me/api/notify';
    this.lineToken = config.line_token;
  }

  notify(message) {
    return new Promise((resolve) => {
      let options = {
        uri: this.linUri,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${this.lineToken}`
        },
        form: {
          message: message
        }
      };
      request(options,(err, response, body) => {
        resolve(JSON.parse(body))
      });
    })
  };

}
