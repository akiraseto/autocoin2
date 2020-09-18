const request = require('request');

module.exports = class Line {

  constructor(line_token) {
    this.linUri = 'https://notify-api.line.me/api/notify';
    this.lineToken = line_token;
  }

  notify(message) {
    //LINEに通知

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
      request(options, (err, response, body) => {
        resolve(JSON.parse(body))
      });
    })
  };

}
