const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken, requireRole, logAction } = require('../middleware/auth');

// GET /api/fines - List fines depending on RBAC
router.get('/', authenticateToken, async (req, res) => {
  try {
    let sql = `
      SELECT f.*, u.name as member_name, u.email as member_email, g.name as group_name 
      FROM fines f
      JOIN users u ON f.member_id = u.id
      JOIN \`groups\` g ON f.group_id = g.id
    `;
    let params = [];

    if (req.user.role === 'admin') {
      // Sees all
    } else if (req.user.role === 'chief') {
      sql += ' WHERE f.group_id = ?';
      params = [req.user.group_id];
    } else {
      sql += ' WHERE f.member_id = ?';
      params = [req.user.id];
    }

    sql += ' ORDER BY f.created_at DESC';
    const fines = await query(sql, params);
    res.json(fines);
  } catch (err) {
    console.error('Fetch Fines Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/fines - Issue fine (Chief or Admin)
router.post('/', authenticateToken, requireRole(['admin', 'chief']), async (req, res) => {
  const { member_id, type, amount, description, group_id } = req.body;
  const targetGroupId = req.user.role === 'admin' ? group_id : req.user.group_id;

  if (!member_id || !type || !amount || !targetGroupId) {
    return res.status(400).json({ message: 'member_id, type, amount, and group are required' });
  }

  try {
    // Verify member exists in the group
    const memberRes = await query('SELECT name FROM users WHERE id = ? AND group_id = ?', [member_id, targetGroupId]);
    if (memberRes.length === 0) {
      return res.status(404).json({ message: 'Member not found in this group' });
    }

    const memberName = memberRes[0].name;

    const result = await query(`
      INSERT INTO fines (group_id, member_id, type, amount, status, description)
      VALUES (?, ?, ?, ?, 'unpaid', ?)
    `, [targetGroupId, member_id, type, amount, description || '']);

    // Send notification
    await query(`
      INSERT INTO notifications (group_id, member_id, type, title, message)
      VALUES (?, ?, 'emergency', 'Disciplinary Fine Issued', ?)
    `, [targetGroupId, member_id, `You have been fined RWF ${amount} for ${type.replace('_', ' ')}. Note: ${description}`]);

    await logAction(
      req.user.id,
      req.user.name,
      targetGroupId,
      'Issue Fine',
      `Issued fine of RWF ${amount} (${type}) to ${memberName}`
    );

    res.status(201).json({
      id: result.insertId,
      group_id: targetGroupId,
      member_id,
      type,
      amount,
      status: 'unpaid',
      description
    });
  } catch (err) {
    console.error('Issue Fine Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/fines/:id/pay - Pay fine (Member pays, or Chief records)
router.post('/:id/pay', authenticateToken, async (req, res) => {
  const fineId = req.params.id;

  try {
    const fineRes = await query('SELECT * FROM fines WHERE id = ?', [fineId]);
    if (fineRes.length === 0) {
      return res.status(404).json({ message: 'Fine not found' });
    }

    const fine = fineRes[0];

    // RBAC validation
    if (req.user.role === 'member' && fine.member_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to pay this fine' });
    }
    if (req.user.role === 'chief' && fine.group_id !== req.user.group_id) {
      return res.status(403).json({ message: 'Unauthorized to pay for this group' });
    }

    if (fine.status === 'paid') {
      return res.status(400).json({ message: 'Fine is already paid' });
    }

    await query('UPDATE fines SET status = \'paid\' WHERE id = ?', [fineId]);

    const memberRes = await query('SELECT name FROM users WHERE id = ?', [fine.member_id]);
    const memberName = memberRes[0]?.name || 'Member';

    await logAction(
      req.user.id,
      req.user.name,
      fine.group_id,
      'Pay Fine',
      `Payment of fine ID ${fineId} (RWF ${fine.amount}) cleared for ${memberName}`
    );

    res.json({ message: 'Fine paid successfully' });
  } catch (err) {
    console.error('Pay Fine Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
