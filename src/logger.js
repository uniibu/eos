import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf } = format;
const logFormat = printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`);
const rtransport = new transports.DailyRotateFile({
  filename: 'eos-%DATE%.log',
  dirname: './logs',
  datePattern: 'YYYY-ww',
  zippedArchive: true,
  maxSize: null,
  maxFiles: 10
});
const ctransport = new transports.Console();
const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD hh:mm:ssZZ' }),
    logFormat
  ),
  transports: [rtransport, ctransport],
  exitOnError: false
});
const noop = () => {}
const logNoop = {
  log:noop,
  info:noop,
  error:noop
}
function loggerInit(lg) {
  lg = lg || logNoop;
  const wrap = {};

  wrap.info = (...args) => {
    args = args.map(a => typeof a !== 'string' ? JSON.stringify(a) : a);
    logger.info(args.join(' '));
    lg.log(args.join(' '))
  };
  wrap.boxen = (args) => {
    logger.info(args);
  };
  wrap.error = (...obj) => {
    if (obj.length > 1) {
      obj = obj.map(a => typeof a !== 'string' ? JSON.stringify(a) : a);
      logger.error(obj.join(' '));
      lg.error(obj.join(' '))
    } else {
      logger.error(JSON.stringify(obj.stack || obj.message || obj));
      lg.error(JSON.stringify(obj.stack || obj.message || obj))
    }
  };
  wrap.warn = (...args) => {
    args = args.map(a => typeof a !== 'string' ? JSON.stringify(a) : a);
    logger.warn(args.join(' '));
    lg.info(args.join(' '))
  };
  return wrap;
}

export default loggerInit