import pino from 'pino';

export const createLogger = () => {
  return pino({
    level: 'info',
    //use pretty print in development
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty' }
        : undefined,
  });
};
