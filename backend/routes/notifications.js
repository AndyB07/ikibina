const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken, requireRole, logAction } = require('../middleware/auth');

// GET /api/notifications - Get notifications depending on RBAC
router.get('/', authenticateToken, async (req, res) => {
  try {
    let sql = 'SELECT * FROM notifications';
    let params = [];

    if (req.user.role === 'admin') {
      // Admin sees system notifications and target admin notifications
      sql += ' WHERE group_id IS NULL OR member_id IS NULL OR member_id = ?';
      params = [req.user.id];
    } else if (req.user.role === 'chief') {
      // Chief sees notifications for their group or general notifications
      sql += ' WHERE (group_id = ? OR group_id IS NULL) AND (member_id IS NULL OR member_id = ?)';
      params = [req.user.group_id, req.user.id];
    } else {
      // Member sees notifications for their group and their specific notifications
      sql += ' WHERE (group_id = ? OR group_id IS NULL) AND (member_id IS NULL OR member_id = ?)';
      params = [req.user.group_id, req.user.id];
    }

    sql += ' ORDER BY created_at DESC';
    const notifications = await query(sql, params);
    res.json(notifications);
  } catch (err) {
    console.error('Fetch Notifications Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/notifications - Send notification (Admin or Chief)
router.post('/', authenticateToken, requireRole(['admin', 'chief']), async (req, res) => {
  const { type, title, message, group_id, member_id } = req.body;
  
  let targetGroupId = req.user.role === 'chief' ? req.user.group_id : group_id;

  if (!type || !title || !message) {
    return res.status(400).json({ message: 'Type, title, and message are required' });
  }

  try {
    await query(`
      INSERT INTO notifications (group_id, member_id, type, title, message)
      VALUES (?, ?, ?, ?, ?)
    `, [targetGroupId || null, member_id || null, type, title, message]);

    await logAction(
      req.user.id,
      req.user.name,
      targetGroupId || null,
      'Send Notification',
      `Sent notification: "${title}" (Type: ${type})`
    );

    res.status(201).json({ message: 'Notification sent successfully' });
  } catch (err) {
    console.error('Send Notification Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/notifications/winner - Nominate weekly winner (Chief only)
router.post('/winner', authenticateToken, requireRole(['chief']), async (req, res) => {
  const { member_id, week_number } = req.body;
  const groupId = req.user.group_id;

  if (!member_id || !week_number) {
    return res.status(400).json({ message: 'member_id and week_number are required' });
  }

  try {
    const userRes = await query('SELECT name FROM users WHERE id = ? AND group_id = ?', [member_id, groupId]);
    if (userRes.length === 0) {
      return res.status(404).json({ message: 'Member not found in your group' });
    }

    const memberName = userRes[0].name;
    const title = '🎉 Weekly Money Receiver Selected!';
    const message = `Congratulations! ${memberName} has been designated as the receiver of the Weekly Pool Contribution for Week ${week_number}. The funds will be transferred shortly.`;

    // 1. Insert notification for the group
    await query(`
      INSERT INTO notifications (group_id, member_id, type, title, message)
      VALUES (?, NULL, 'winner_notification', ?, ?)
    `, [groupId, title, message]);

    // 2. Insert private notification for the winner
    await query(`
      INSERT INTO notifications (group_id, member_id, type, title, message)
      VALUES (?, ?, 'winner_notification', 'You are the Weekly Winner!', ?)
    `, [groupId, member_id, `You have been selected to receive the pooled funds for Week ${week_number}.`]);

    await logAction(
      req.user.id,
      req.user.name,
      groupId,
      'Assign Weekly Winner',
      `Designated ${memberName} as weekly winner for Week ${week_number}`
    );

    res.json({ message: 'Weekly winner announced successfully!' });
  } catch (err) {
    console.error('Assign Winner Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/notifications/:id/read - Mark read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  const notifId = req.params.id;
  try {
    // If member, check if matches group_id or member_id
    await query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [notifId]);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Mark Read Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
