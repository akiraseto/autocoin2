# autocoin

BitflyerのAPIを利用して、node.jsにて仮想通貨トレードを自動化する。

## アルゴリズム
- 間隔 60秒  (cryptowatchAPI最小が1分なため)

- 移動平均線
損しないのを重要視するため、値動きに敏感なものを採用
    - EMA移動平均線を採用
    - 短期:5分、長期:30分の移動平均線とする。

- 買い注文判断  AND両方当てはまる場合
    - ゴールデンクロス
    - 5回中3回が上昇だった場合(3回連続上昇の判断は遅すぎる)
    - 成行注文

- 売り注文判断 OR
    - 利確  指値で購入価格の数%
    - ロスカット  指値で購入価格の-数%
    - 5回中4回が下降だった場合、即成行きで売る
    - デッドクロス  成行きで即売り
    (下がる兆候が強い、上がる見込みが無いため確定する)

- スワップポイント対策  
23:55-0:05の間
    - 注文を受け付けない
    - 買建玉を成行で売る

## ccxt
bitflyerのAPIラッパー  
ccxtモジュールを通してbitflyerからLTP取得、売買の通信を行う

[https://github.com/ccxt/ccxt](https://github.com/ccxt/ccxt)

## cryptowatch
起動時、EMA算出用にLTP値を一定時間取得

apiドキュメント  
[https://developer.cryptowat.ch/reference/rest-api-getting-started](https://developer.cryptowat.ch/reference/rest-api-getting-started)

使用メモ  
bitflyerの1日の値動き  
afterにいつからの日付かを指定（以下は2018/11/20）  
periodsに秒数をいれることで間隔を設定 1時間3600 1日86400  
`https://api.cryptowat.ch/markets/bitflyer/btcfxjpy/ohlc?periods=86400&after=1542668714`

無料枠  
cpu allowance  = 4秒 /1時間

OHLC ローソク足のこと  
open high low close
始値 高値 低値 終値   をチャートにするって意味  
ローソク足→Candle Chartの欧米正式名称

## gauss
移動平均計算ライブラリ  
[https://github.com/fredrick/gauss](https://github.com/fredrick/gauss)

## MongoDB
MongoDBを利用して売買ログを記録

db名:autocoin
collection名: btcfx

### Mac
構築手順

```shell

brew install mongodb

#自動起動に設定
brew services start mongodb

```

### Ubuntu18.04
構築手順

```shell

#パッケージ管理システムに公開鍵を登録
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4

#ダウンロード用のリストファイルを作成
echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/4.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.0.list

#パッケージ管理システムのデータベースをリロード
sudo apt-get update

#最新の安定版をインストール
sudo apt-get install -y mongodb-org

#MongoDBを自動起動にする
sudo systemctl enable mon

#MongoDBを起動
sudo service mongod start
```
