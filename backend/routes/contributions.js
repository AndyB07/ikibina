const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticateToken, logAction } = require('../middleware/auth');

// GET /api/contributions - List contributions based on role
router.get('/', authenticateToken, async (req, res) => {
  try {
    let sql = `
      SELECT c.*, u.name as member_name, u.email as member_email, g.name as group_name 
      FROM contributions c
      JOIN users u ON c.member_id = u.id
      JOIN \`groups\` g ON c.group_id = g.id
    `;
    let params = [];

    if (req.user.role === 'admin') {
      // Admin sees everything
    } else if (req.user.role === 'chief') {
      // Chief sees only their group's contributions
      sql += ' WHERE c.group_id = ?';
      params = [req.user.group_id];
    } else {
      // Member sees only their own personal contributions
      sql += ' WHERE c.member_id = ?';
      params = [req.user.id];
    }

    sql += ' ORDER BY c.week_number DESC, c.payment_date DESC';
    const contributions = await query(sql, params);
    res.json(contributions);
  } catch (err) {
    console.error('Fetch Contributions Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/contributions/summary - Weekly contribution summary
router.get('/summary', authenticateToken, async (req, res) => {
  let targetGroupId = req.user.group_id;

  if (req.user.role === 'admin') {
    // If admin calls, they can optionally specify group_id in query params
    targetGroupId = req.query.group_id || null;
  }

  if (!targetGroupId && req.user.role !== 'admin') {
    return res.status(400).json({ message: 'User is not assigned to any group' });
  }

  try {
    let sql = `
      SELECT 
        c.week_number,
        COUNT(CASE WHEN c.status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN c.status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN c.status = 'missed' THEN 1 END) as missed_count,
        SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END) as total_collected,
        SUM(CASE WHEN c.status = 'pending' THEN c.amount ELSE 0 END) as total_pending
      FROM contributions c
    `;
    let params = [];

    if (targetGroupId) {
      sql += ' WHERE c.group_id = ?';
      params = [targetGroupId];
    }

    sql += ' GROUP BY c.week_number ORDER BY c.week_number DESC';

    const summary = await query(sql, params);
    res.json(summary);
  } catch (err) {
    console.error('Fetch Contributions Summary Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/contributions/:id/pay - Record/Submit payment (Chief for member or member self-pay)
router.post('/:id/pay', authenticateToken, async (req, res) => {
  const contributionId = req.params.id;

  try {
    const cont = await query('SELECT * FROM contributions WHERE id = ?', [contributionId]);
    if (cont.length === 0) {
      return res.status(404).json({ message: 'Contribution record not found' });
    }

    const contribution = cont[0];

    // RBAC validation
    if (req.user.role === 'member' && contribution.member_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized: Can only pay for your own contributions' });
    }
    if (req.user.role === 'chief' && contribution.group_id !== req.user.group_id) {
      return res.status(403).json({ message: 'Unauthorized: Can only pay for members in your group' });
    }

    if (contribution.status === 'paid') {
      return res.status(400).json({ message: 'Contribution is already paid' });
    }

    // Process payment
    await query(`
      UPDATE contributions 
      SET status = 'paid', payment_date = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [contributionId]);

    // Fetch user details for notification & logs
    const users = await query('SELECT name FROM users WHERE id = ?', [contribution.member_id]);
    const memberName = users.length > 0 ? users[0].name : 'Member';

    // Log the transaction
    await logAction(
      req.user.id,
      req.user.name,
      contribution.group_id,
      'Contribution Payment',
      `Payment of ${contribution.amount} recorded for ${memberName} (Week ${contribution.week_number})`
    );

    // If there was a matching notification for payment reminder, mark it read (optional logic)

    res.json({
      message: 'Payment completed successfully',
      contribution: {
        id: contributionId,
        status: 'paid',
        payment_date: new Date()
      }
    });
  } catch (err) {
    console.error('Process Payment Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/contributions/:id/receipt - Generate receipt details
router.get('/:id/receipt', authenticateToken, async (req, res) => {
  const contributionId = req.params.id;

  try {
    const details = await query(`
      SELECT 
        c.id, c.amount, c.payment_date, c.status, c.week_number,
        u.name as member_name, u.email as member_email, u.phone as member_phone,
        g.name as group_name, g.code as group_code
      FROM contributions c
      JOIN users u ON c.member_id = u.id
      JOIN \`groups\` g ON c.group_id = g.id
      WHERE c.id = ?
    `, [contributionId]);

    if (details.length === 0) {
      return res.status(404).json({ message: 'Contribution receipt not found' });
    }

    const receipt = details[0];

    // RBAC validation
    if (req.user.role === 'member' && receipt.member_name !== req.user.name && req.user.email !== receipt.member_email) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    if (req.user.role === 'chief' && req.user.group_id !== details[0].group_id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(receipt);
  } catch (err) {
    console.error('Fetch Receipt Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
