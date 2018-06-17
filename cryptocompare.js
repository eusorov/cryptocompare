const io = require('socket.io-client');
const fetch = require ('node-fetch');
const ipc = require ('node-ipc');
const moment = require('moment');
const dotenv = require("dotenv");
dotenv.config({ path: ".env" });

const CCC = require('./src/ccc-streamer-utilities');
const log = require('./src/log');
const krakenMarket = require( './kraken-markets.json')

const streamUrl = "https://streamer.cryptocompare.com/";
const tradeablePairsKrakenUrl = "https://api.kraken.com/0/public/AssetPairs";
const fsymCc = "BTC";
const tsymCc = "USD";
const subscriptionUrl = "https://min-api.cryptocompare.com/data/subs?fsym=" + fsymCc + "&tsyms=" + tsymCc;

const pairMap = new Map();
function Cryptocompare (){

  this.socket = io(streamUrl, { transports: ['websocket']});
  this.start = function () {
    return getRest(tradeablePairsKrakenUrl).then((tradeablePairs) => {
      let subs = [];
      for (pairKey in tradeablePairs.result){
        const capabilities = krakenMarket;
        let market = capabilities.markets.find((market) => {
          return market.book === pairKey;
        });

        if (market){
          subs.push(subscribeToTrades(0,market.pair[0], market.pair[1], 'Kraken'));
        }
        const pair = tradeablePairs.result[pairKey];

        log.info(pairKey);
      }

      return new Promise((resolve) => {resolve(subs)});
    })
  }

  this.connect = function (){
    return new Promise((resolve, reject) => {
      this.socket.on('connect', function(){
        var subs = [];
        log.debug("we are connected");
        resolve();
      });
    });
  };

  this.socket.on('connect_error', (error) => {
    log.error(error);
  });


  this.socket.on('error', (error) => {
    log.error(error);
  });

  this.subscribe = function(subs){
    subs = [];
    subs.push(subscribeToTrades(0,'ETH', 'EUR', 'Kraken'));
    this.socket.emit('SubAdd', { subs: subs });
    log.debug(subs);
  }

  this.socket.on('m', function(currentData) {
      var tradeField = currentData.substr(0, currentData.indexOf("~"));
      let newTrade;
      if (tradeField == CCC.STATIC.TYPE.CURRENT) {
        newTrade = transformCurrentData(currentData);
      }else
      if (tradeField == CCC.STATIC.TYPE.TRADE) {
        newTrade = transformTradeData(currentData);
      }

    if (newTrade && newTrade.price){
        const key = newTrade.asset + newTrade.currency+  newTrade.exchange;
        const ts = moment.unix(newTrade.timestamp)
        log.debug("cc got " + newTrade.asset + ' ' + newTrade.currency+ ' '+ newTrade.exchange + ' '+ ts.utc().format());
        pairMap.set(key.toUpperCase(), newTrade);
        //broadcast(newTrade);
    }
  });
}

const cc = new Cryptocompare();
cc.connect().then(()=> cc.start()).then((subs)=> cc.subscribe(subs));

//createServer('cryptocompare', '/tmp/cc.cryptocompareserver').then(()=> {

//})

function getRest(dataUrl){
   return new Promise((resolve, reject) => {
     fetch(dataUrl)
     .then(response => resolve(response.json()))
     .catch((error) => {
       log.error('Cryptocompare API not available.');
       reject(`Cryptocompare API not available.Error: ${error}`);
     });
   });
}


// flag: 0 = get TRADES
// Use SubscriptionId 0 for TRADE, 2 for CURRENT, 5 for CURRENTAGG eg use key '5~CCCAGG~BTC~USD' to get aggregated data from the CCCAGG exchange
function subscribeToTrades(flag, asset, currency, exchange){
  // myCurrentSubs1 = '0~Kraken~BTC~EUR';
  // myCurrentSubs2 = '0~Kraken~ETH~EUR';
  if (asset == 'XBT')
    asset = 'BTC';
  if (currency == 'XBT')
    currency = 'BTC';
  return flag+'~'+exchange+'~'+asset+'~'+currency;
}

function transformTradeData(data) {
	var incomingTrade = CCC.TRADE.unpack(data);
  //console.log(incomingTrade);
  let fsym = incomingTrade['FSYM'];
  let tsym = incomingTrade['TSYM'];
  var coinfsym = CCC.STATIC.CURRENCY.getSymbol(fsym);
  var cointsym = CCC.STATIC.CURRENCY.getSymbol(tsym);

	var newTrade = {
    asset: fsym,
    currency: tsym,
		exchange: incomingTrade['M'],
		type: incomingTrade['T'],
		id: incomingTrade['ID'],
		timestamp: incomingTrade['TS'],
		//Price: CCC.convertValueToDisplay(cointsym, incomingTrade['P']),
		price: incomingTrade['P'],
		quantity: incomingTrade['Q'],
		total: incomingTrade['TOTAL']
	};

	// if (incomingTrade['F'] & 1) {
	// 	newTrade['Type'] = "SELL";
	// }
	// else if (incomingTrade['F'] & 2) {
	// 	newTrade['Type'] = "BUY";
	// }
	// else {
	// 	newTrade['Type'] = "UNKNOWN";
	// }

  return newTrade;
};

function transformCurrentData(data) {
	var incomingTrade = CCC.CURRENT.unpack(data);
  let fsym = incomingTrade['FROMSYMBOL'];
  let tsym = incomingTrade['TOSYMBOL'];

	var newCurrent = {
    asset: fsym,
    currency: tsym,
		exchange: incomingTrade['MARKET'],
		type: incomingTrade['FLAGS'],
		id: incomingTrade['LASTTRADEID'],
    timestamp: ((new Date().getTime())/1000), //or better utc?
		price: incomingTrade['PRICE'],
		quantity: incomingTrade['LASTVOLUME'],
		total: incomingTrade['LASTVOLUME']
	};

  return newCurrent;
};


function createServer(connectionid, serverpath) {
  ipc.config.id = connectionid;
  ipc.config.retry= 1500;
  ipc.config.silent= true;

  const promise = new Promise((resolve, reject) => {
    ipc.serve(serverpath, ()=> {
      resolve(true);
    })

  })
  ipc.server.start();

  return promise;
}

function broadcast(data) {
  ipc.server.broadcast('quota', data);
}