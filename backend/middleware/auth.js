const jwt = require('jsonwebtoken');
const { query } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'ikibina_secret_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
}

async function logAction(userId, username, groupId, action, details) {
  try {
    await query(`
      INSERT INTO audit_logs (user_id, username, group_id, action, details)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, username, groupId, action, details]);
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
}

module.exports = {
  authenticateToken,
  requireRole,
  logAction,
  JWT_SECRET
};
