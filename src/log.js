var winston = require('winston');
const { format } = winston;
const { combine, timestamp, label, printf } = format;

const SentryTransport = require('./logstransport/sentry_transport');
const LogzTransport = require('./logstransport/logz_transport');

const winstonLogger = winston.createLogger({
  transports: [
    new winston.transports.File({
      name : 'filelogger',
      filename: 'logs/cryptocompare.log',
      level: 'debug',
      handleExceptions: false,
      json: false,
      maxsize: 5242880, //5MB
      maxFiles: 5,
      colorize: false,
      format: combine(
          timestamp(), // utc!
          winston.format.printf(info =>`${info.timestamp} ${info.level}: ${info.message}`)
      )
    }),

    new winston.transports.Console({
        level: 'debug',
        handleExceptions: true,
        prettyPrint: true,
        colorize: true,
        format: combine(
          timestamp(), // utc!
          winston.format.printf(info =>`${info.timestamp} ${info.level}: ${info.message}`)
        )
    }),

    // send only errors to Sentry (good library for errors fixing)
    /*
    new SentryTransport({
      token : process.env.SENTRY_DSN,
      level: 'error'
    }),

    new LogzTransport({
      token: process.env.LOGZ_KEY,
      host: 'listener.logz.io',
      type: 'gekko',
      level: 'error'
    })
    */
  ]
});

module.exports = winstonLogger;
