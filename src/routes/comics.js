const express = require('express');
const router = express.Router();
const xkcdService = require('../services/xkcdService');
const { param, query, validationResult } = require('express-validator');
const fetch = require('node-fetch');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: errors.array()[0].msg
    });
  }
  next();
};

router.get('/latest', async (req, res, next) => {
  try {
    const cached = xkcdService.cache && xkcdService.cache.get('latest');
    if (cached && Date.now() - cached.timestamp < xkcdService.cacheTimeout) {
      return res.json(cached.data);
    }
    const comic = await xkcdService.getLatest();
    res.json(comic);
  } catch (error) {
    next(error);
  }
});

router.get('/random', async (req, res, next) => {
  try {
    const latest = await xkcdService.getLatest();
    const maxId = latest.id;
    for (let i = 0; i < 5; i++) {
      const randId = 1 + Math.floor(Math.random() * maxId);
      try {
        const r = await fetch(`https://xkcd.com/${randId}/info.0.json`);
        if (r.status === 404) continue;
        if (!r.ok) continue;
        const json = await r.json();
        return res.json(xkcdService.processComic(json));
      } catch {}
    }
    return res.json(latest);
  } catch (error) {
    next(error);
  }
});

router.get('/search',
  [
    query('q')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Query must be between 1 and 100 characters'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  validate,
  async (req, res, next) => {
    try {
      const q = (req.query.q || '').toLowerCase();
      const page = req.query.page ? parseInt(req.query.page, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;

      const latest = await xkcdService.getLatest();
      const maxId = latest.id;
      const RANGE = 100;
      const startId = maxId;
      const endId = Math.max(1, maxId - RANGE + 1);

      const ids = [];
      for (let id = startId; id >= endId; id--) ids.push(id);

      const batchSize = 20;
      const matches = [];

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize).map(async (id) => {
          try {
            const r = await fetch(`https://xkcd.com/${id}/info.0.json`);
            if (r.status === 404 || !r.ok) return null;
            const json = await r.json();
            const c = xkcdService.processComic(json);
            const hay = `${c.title || ''}\n${c.transcript || ''}\n${c.alt || ''}`.toLowerCase();
            if (hay.includes(q)) return c;
            return null;
          } catch {
            return null;
          }
        });
        const results = await Promise.all(batch);
        for (const c of results) {
          if (c) matches.push(c);
        }
      }

      const total = matches.length;
      const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
      const safePage = Math.min(Math.max(1, Number(page) || 1), Math.max(1, totalPages));
      const offset = (safePage - 1) * limit;
      const results = matches.slice(offset, offset + limit);

      return res.json({
        query: req.query.q,
        results,
        total,
        pagination: {
          page: totalPages === 0 ? 0 : safePage,
          limit,
          totalPages,
          offset
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id',
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Comic ID must be a positive integer')
  ],
  validate,
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const r = await fetch(`https://xkcd.com/${id}/info.0.json`);
      if (r.status === 404) {
        return res.status(404).json({
          error: 'Comic not found',
          message: 'The requested comic does not exist'
        });
      }
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      }
      const json = await r.json();
      return res.json(xkcdService.processComic(json));
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
