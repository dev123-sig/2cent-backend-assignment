import winston from 'winston';

const { combine, timestamp, json, printf, colorize } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    json()
  ),
  defaultMeta: { service: 'exchange-backend' },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'development' 
        ? combine(colorize(), timestamp({ format: 'HH:mm:ss.SSS' }), devFormat)
        : combine(timestamp(), json()),
    }),
  ],
});

export default logger;
