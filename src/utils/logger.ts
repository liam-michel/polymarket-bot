import pino from 'pino';

export const createLogger = (logLevel: string) => {
  const logger = pino({
    level: logLevel,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  });
  return logger;
};
