/**
 * Logger Utility
 * 
 * Simple logging wrapper (can be extended to use Winston/Bunyan in production)
 */

class Logger {
  static formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
    return `[${timestamp}] [${level}] ${message} ${metaStr}`;
  }

  static info(message, meta = {}) {
    console.log(this.formatMessage('INFO', message, meta));
  }

  static error(message, meta = {}) {
    console.error(this.formatMessage('ERROR', message, meta));
  }

  static warn(message, meta = {}) {
    console.warn(this.formatMessage('WARN', message, meta));
  }

  static debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('DEBUG', message, meta));
    }
  }

  static request(req) {
    const message = `${req.method} ${req.originalUrl}`;
    const meta = {
      ip: req.ip,
      userAgent: req.get('user-agent')
    };
    this.info(message, meta);
  }
}

module.exports = Logger;
