const Transport = require('winston-transport');
const Logzio = require('logzio-nodejs');

//
// Inherit from `winston-transport` so you can take advantage
// of the base functionality and `.exceptions.handle()`.
//
class LogzTransport extends Transport {

  constructor(opts = {}) {
    super(opts);

    this.name = 'logz_transport';
    this.token = opts.token;
    this.host = opts.host;
    this.type = opts.type;

    this.logzlogger = Logzio.createLogger({
      token: this.token,
      host: this.host,
      type: this.type     // OPTIONAL (If none is set, it will be 'nodejs')
    });
  }

  log(info, callback){ // meta is included in message-string! we need probably to parse later
  //  console.log(JSON.stringify(info));
    if (this.silent) {
      callback();
      return true;
    }

    this.sendMsg(info.level, info.message, info.meta).then(()=> {
      this.emit('logged');
      callback(null, true);
    })
  }

  // sendMsg
  sendMsg(level, msg, meta) {
    if (meta){ // what about meta?

    }
    return new Promise( resolve => {
      this.logzlogger.log(msg + (undefined !== meta) ? JSON.stringify(meta) : '');
      return resolve(true);
    });
  }
};

module.exports = LogzTransport;
