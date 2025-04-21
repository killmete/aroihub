import { Request, Response } from 'express';
import logger from '../utils/logger';

export const handleFrontendLog = (req: Request, res: Response): void => {
  try {
    const { level, message, timestamp, userAgent, url, args } = req.body;

    const logDetails = {
      message,
      timestamp,
      userAgent,
      url,
      args,
      source: 'frontend'
    };

    switch (level) {
      case 'debug':
        logger.debug(message, logDetails);
        break;
      case 'info':
        logger.info(message, logDetails);
        break;
      case 'warn':
        logger.warn(message, logDetails);
        break;
      case 'error':
        logger.error(message, logDetails);
        break;
      default:
        logger.info('Received unknown log level', { level, ...logDetails });
    }

    res.status(204).send(); 
  } catch (err) {
    logger.error('Failed to handle frontend log', err);
    res.status(500).json({ message: 'Failed to process frontend log' });
  }
};
