const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const comicsRouter = require('./routes/comics');
const loggingMiddleware = require('./middleware/logging');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

let stats = {
  totalRequests: 0,
  endpointStats: {},
  startTime: Date.now()
};

app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api', limiter);

app.use(loggingMiddleware);

app.use((req, res, next) => {
  stats.totalRequests += 1;
  res.on('finish', () => {
    const key = `${req.method} ${req.originalUrl.split('?')[0]}`;
    if (!stats.endpointStats[key]) {
      stats.endpointStats[key] = 0;
    }
    stats.endpointStats[key] += 1;
  });
  next();
});

app.options('/api/*', (req, res) => res.sendStatus(204));

app.use('/api/comics', comicsRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    totalRequests: stats.totalRequests,
    endpointStats: stats.endpointStats,
    uptime: process.uptime()
  });
});

app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path
  });
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  next(err);
});

app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
