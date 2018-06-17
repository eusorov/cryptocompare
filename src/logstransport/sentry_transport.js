const Transport = require('winston-transport');
const Raven = require('raven');

//
// Inherit from `winston-transport` so you can take advantage
// of the base functionality and `.exceptions.handle()`.
//
class SentryTransport extends Transport {

  constructor(opts = {}) {
    super(opts);

    this.name = 'sentry_transport';
    this.token = opts.token;

    Raven.config(this.token).install();
    //
    // Consume any custom options here. e.g.:
    // - Connection information for databases
    // - Authentication information for APIs (e.g. loggly, papertrail,
    //   logentries, etc.).
    //
  }


//  {"level":"info","message":"2018-06-17 12:58:16 (INFO):\twe are connected  { mymeta: 'this is meta' }"}
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

  // sendMsg with reconnection possibility
  sendMsg(level, msg, meta) {
    if (meta){
      Raven.captureBreadcrumb(meta);
    }
    return new Promise( resolve => {
      Raven.captureMessage(msg, ( err, eventId)=> {
        if (err){
          return new Promise(resolve=>setTimeout(resolve, 2000)) // reconnect in 2sec
            .then(()=> this.sendMsg(level, msg, meta))
        }else{
          return resolve(true);
        }
      });
    });
  }
};

module.exports = SentryTransport;
