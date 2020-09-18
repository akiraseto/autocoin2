# Autocoin2

BitCoinのFX自動売買プログラム。   
BitflyerのAPIを利用して、node.jsにて仮想通貨トレードを自動化。


## Features

- 売り・買いポジション両方対応
- 複数アルゴリズムによる重み付け売買判断
- MongoDBによる売買履歴の保存
- Docker対応
- プログラム開始をLine通知
- 損得金額の閾値を超えたら、Lineにて通知
- 設定の日数が経過したら、ポジションを自動で手放す機能 :SWAP金回避
- 日付変更30分前には、新たなポジション取得を抑制する機能 :SWAP金回避
- Apple Home連携で外出先でもiphoneから1タップでON/OFF *条件あり*
- プログラム稼働中でも、並行して通常の人的トレードも可能

### Trade Algorithm

- ボリンジャーバンド
- ゴールデンクロス・デッドクロス
- サイコロジカルライン

デフォルト設定は、ボリンジャーに重みを持たせた3アルゴリズムの複合判断。  
アルゴリズムの重み付けはハイパーパラメーターを通して変更可能。また、アルゴリズムの追加も考慮した設計。

#### Loss Cut Algorithm

日足によるアルゴリズム判断   
分単位のトレンド判断ではロス判断するのには、かなり刹那的、流動的と考慮の為。   
*分足や、時間足など判断スパンを変更することも可能。*

## Requirement

### ccxt
bitflyerのAPIラッパー。bitflyerからLTP取得、売買命令を実行   
[https://github.com/ccxt/ccxt](https://github.com/ccxt/ccxt)

### cryptowatch
起動時、設定した時間枠・間隔のOHLC値を取得   
apiドキュメント: [https://docs.cryptowat.ch/rest-api/](https://docs.cryptowat.ch/rest-api/)


### gauss
計算ライブラリ  
[https://github.com/fredrick/gauss](https://github.com/fredrick/gauss)


### mongodb
MongoDBに売買ログを記録


### moment
日時計算ライブラリ


## Installation

### Bitflyerの登録・APIのkey,secret取得

[Bitflyer](https://bitflyer.com/ja-jp/)  
[API Documentation](https://lightning.bitflyer.com/docs)


### LineNotifyの登録・tokenの発行

tokenを発行して、Line Notifyの通知機能を利用する。  
[LINE Notify](https://notify-bot.line.me/ja/)


### config.js作成

Bitflyer,LineのAPIを設定。

```bash
#ファイル名変更
cp autocoin/config_sample.js autocoin/config.js

#取得したkey,secret,tokenを入力。
```


### .env作成

MongoDBのuser,passwordを設定。

```bash
#ファイル名変更
cp .env_sample .env

#MongoDBのuser,passwordを入力
```


## Usage

### 実行

```bash
docker-compose up -d
```


### 停止

```bash
docker-compose down
```


### ログ確認
node containerの標準出力によるログの確認

```bash
docker logs -f node
```


### MongoDBの取引内容確認

```bash
docker exec -it mongo bash
mongo -u <username> -p
<password>

#mongo login
use autocoin;
db.btcfx.find();
```


## Note

- トレード間隔は、最短60秒  (取引情報取得のcryptowatchAPIが最小単位を1分としている為)
- cryptowatchの無料枠の負荷率: cpu allowance = 4sec / 1hour

### Apple Home連携
iphone,AppleWatchからプログラムのON/OFF

以下の条件・手順が必要

1. AWS EC2インスタンスにDockerを展開
2. AWS sshのインバウンド設定を有効、Elastic IPにて固定IPを取得
3. 自宅にRaspberry Piなどのオンプレミス運用 (以降ラズパイ)
4. ラズパイにhomebridgeをインストール
5. homebridgeのconfig.jsにon/offをボタンを設定し、実行プログラムを紐付ける
6. 実行プログラムにAWSのuser,IPアドレス, pemファイルを設定

#### homebridgeの設定は以下を参照
[homebridge](https://www.npmjs.com/package/homebridge)

#### ラズパイ上の実行ファイル

```bash
#実行プログラム ファイル名変更
cp homebridge_AWS/startAWS_sample.sh homebridge_AWS/startAWS.sh
cp homebridge_AWS/stopAWS_sample.sh homebridge_AWS/stopAWS.sh
#任意の値を設定

```


## Author

- akinko
- akira.seto@gmail.com
- [Qiita](https://qiita.com/akinko)


## License

[MIT license](https://en.wikipedia.org/wiki/MIT_License).























