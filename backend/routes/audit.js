const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/audit - List all audit logs (Admin only)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const logs = await query(`
      SELECT a.*, g.name as group_name 
      FROM audit_logs a
      LEFT JOIN \`groups\` g ON a.group_id = g.id
      ORDER BY a.created_at DESC
      LIMIT 200
    `);
    res.json(logs);
  } catch (err) {
    console.error('Fetch Audit Logs Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
