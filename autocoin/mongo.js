const MongoClient = require('mongodb').MongoClient;

module.exports = class Mongo {

  constructor() {
    const mongo_user = process.env.MONGO_INITDB_ROOT_USERNAME;
    const mongo_pw = process.env.MONGO_INITDB_ROOT_PASSWORD;
    // todo:ダミー最終で消す
    // const mongo_user = 'eren';
    // const mongo_pw = 'yeager';


    this.dbUrl = `mongodb://${mongo_user}:${mongo_pw}@mongo:27017`;
    this.dbName = 'autocoin';
    this.cName = 'btcfx';
    this.dbOptions = {
      useUnifiedTopology : true,
      useNewUrlParser : true
    };
  }

  async insert(object) {
    await MongoClient.connect(this.dbUrl, this.dbOptions, (err, client) => {
      if (err) {
        console.log(err);
      } else {
        const db = client.db(this.dbName);
        const collection = db.collection(this.cName);
        collection.insertOne(object,
            (err, result) => {
              if (result) {
                console.log('DBに書き込み');
              } else {
                console.log(err);
              }
            }
        );
        client.close();
      }
    });
  }

}
