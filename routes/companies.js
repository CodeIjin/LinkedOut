/**
 * LinkedOut Companies & Red Flag Radar API
 * Provides toxicity analytics and leaderboards across companies.
 */

const express = require('express');
const { getCompanyRedFlagStats } = require('../models/store');

const router = express.Router();

/**
 * GET /api/companies/stats
 * Returns company red flag ranking and toxicity metrics
 */
router.get('/stats', (req, res) => {
  const stats = getCompanyRedFlagStats();
  return res.json({
    success: true,
    count: stats.length,
    companies: stats
  });
});

module.exports = router;
