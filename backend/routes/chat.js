const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/chat - Get group messages
router.get('/', authenticateToken, async (req, res) => {
  const groupId = req.user.group_id;
  if (!groupId) {
    return res.status(400).json({ message: 'User is not assigned to any group' });
  }

  try {
    const messages = await query(`
      SELECT m.id, m.message, m.created_at, u.name as sender_name, u.role as sender_role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.group_id = ?
      ORDER BY m.created_at ASC
      LIMIT 100
    `, [groupId]);
    res.json(messages);
  } catch (err) {
    console.error('Fetch Messages Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/chat - Send a group message
router.post('/', authenticateToken, async (req, res) => {
  const groupId = req.user.group_id;
  const senderId = req.user.id;
  const { message } = req.body;

  if (!groupId) {
    return res.status(400).json({ message: 'User is not assigned to any group' });
  }
  if (!message || message.trim() === '') {
    return res.status(400).json({ message: 'Message content is required' });
  }

  try {
    const result = await query(`
      INSERT INTO messages (group_id, sender_id, message)
      VALUES (?, ?, ?)
    `, [groupId, senderId, message]);

    res.status(201).json({
      id: result.insertId,
      group_id: groupId,
      sender_id: senderId,
      sender_name: req.user.name,
      sender_role: req.user.role,
      message,
      created_at: new Date()
    });
  } catch (err) {
    console.error('Send Message Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
