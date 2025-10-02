const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// TODO: Complete the logging middleware
module.exports = (req, res, next) => {
  // Generate a unique request ID (use Math.random().toString(36).substr(2, 9))
  const requestId = Math.random().toString(36).substr(2, 9);

  // Set req.requestId to the generated ID
  req.requestId = requestId;

  // Set req.startTime to current timestamp (Date.now())
  req.startTime = Date.now();
  
  // Log the incoming request with:
  // - requestId
  // - method
  // - url
  // - ip
  // - userAgent (use req.get('User-Agent'))
  logger.info({
    requestId: requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Call next() to continue to the next middleware
  next(); // This should remain at the end
};
