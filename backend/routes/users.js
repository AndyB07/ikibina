const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { authenticateToken, requireRole, logAction } = require('../middleware/auth');

// Helper to generate a simple mock temporary password
function generateTempPassword() {
  return 'temp' + Math.floor(1000 + Math.random() * 9000);
}

// GET /api/users - Fetch users list with group details
router.get('/', authenticateToken, async (req, res) => {
  try {
    let sql = `
      SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.group_id, u.created_at, g.name as group_name 
      FROM users u
      LEFT JOIN \`groups\` g ON u.group_id = g.id
    `;
    let params = [];

    if (req.user.role === 'chief') {
      // Chief can only see members of their own group
      sql += ' WHERE u.group_id = ? AND u.role = \'member\'';
      params = [req.user.group_id];
    } else if (req.user.role === 'member') {
      // Members can only see their fellow group members
      sql += ' WHERE u.group_id = ?';
      params = [req.user.group_id];
    }
    // Admin gets everything

    const users = await query(sql, params);
    res.json(users);
  } catch (err) {
    console.error('Fetch Users Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/users/chief - Register a Chief (Admin only)
router.post('/chief', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { name, email, phone, group_id } = req.body;
  if (!name || !email || !phone || !group_id) {
    return res.status(400).json({ message: 'Name, email, phone, and group_id are required' });
  }

  try {
    // Check if user email exists
    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Check if group exists
    const groupCheck = await query('SELECT name FROM \`groups\` WHERE id = ?', [group_id]);
    if (groupCheck.length === 0) {
      return res.status(404).json({ message: 'Assigned group does not exist' });
    }

    // Generate credentials
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const result = await query(`
      INSERT INTO users (name, email, phone, password, role, status, group_id)
      VALUES (?, ?, ?, ?, 'chief', 'active', ?)
    `, [name, email, phone, hashedPassword, group_id]);

    const chiefId = result.insertId;

    // Send notifications / Log credential send (mocked SMS/Email)
    const smsMessage = `CREDENTIALS SENT TO CHIEF ${name} (Email: ${email}, Temporary Password: ${tempPassword})`;
    console.log(`[SMS/Email Notification] ${smsMessage}`);

    // Insert system notification
    await query(`
      INSERT INTO notifications (group_id, member_id, type, title, message)
      VALUES (?, ?, 'system', 'Chief Appointed', ?)
    `, [group_id, chiefId, `Welcome ${name} as the Chief of ${groupCheck[0].name}. Credentials sent via email/SMS.`]);

    await logAction(req.user.id, req.user.name, group_id, 'Register Chief', `Registered Chief ${name} and assigned to group ${groupCheck[0].name}`);

    res.status(201).json({
      id: chiefId,
      name,
      email,
      phone,
      role: 'chief',
      group_id,
      tempPassword,
      message: 'Chief registered successfully. Temporary credentials generated.'
    });
  } catch (err) {
    console.error('Register Chief Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/users/member - Register a Member (Admin or Chief)
router.post('/member', authenticateToken, requireRole(['admin', 'chief']), async (req, res) => {
  const { name, email, phone, group_id } = req.body;
  
  // Define group to associate
  let targetGroupId = req.user.role === 'chief' ? req.user.group_id : group_id;

  if (!name || !email || !phone || !targetGroupId) {
    return res.status(400).json({ message: 'Name, email, phone, and group_id are required' });
  }

  try {
    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const groupCheck = await query('SELECT name FROM \`groups\` WHERE id = ?', [targetGroupId]);
    if (groupCheck.length === 0) {
      return res.status(404).json({ message: 'Group does not exist' });
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const result = await query(`
      INSERT INTO users (name, email, phone, password, role, status, group_id)
      VALUES (?, ?, ?, ?, 'member', 'active', ?)
    `, [name, email, phone, hashedPassword, targetGroupId]);

    const memberId = result.insertId;

    console.log(`[SMS/Email Notification] CREDENTIALS SENT TO MEMBER ${name} (Email: ${email}, Temp Password: ${tempPassword})`);

    // Create system notification for group
    await query(`
      INSERT INTO notifications (group_id, member_id, type, title, message)
      VALUES (?, ?, 'system', 'New Member Joined', ?)
    `, [targetGroupId, memberId, `${name} has joined the group. Welcome!`]);

    // Initialize contributions for this member. Let's create weekly contributions for week 1 to 5 as pending
    for (let w = 1; w <= 10; w++) {
      await query(`
        INSERT INTO contributions (group_id, member_id, amount, status, week_number)
        VALUES (?, ?, 5000.00, 'pending', ?)
      `, [targetGroupId, memberId, w]);
    }

    await logAction(req.user.id, req.user.name, targetGroupId, 'Register Member', `Registered member ${name} in group ${groupCheck[0].name}`);

    res.status(201).json({
      id: memberId,
      name,
      email,
      phone,
      role: 'member',
      group_id: targetGroupId,
      tempPassword,
      message: 'Member registered successfully. Initial contribution schedule created.'
    });
  } catch (err) {
    console.error('Register Member Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/:id - Edit Chief/Member profile (Admin or Chief)
router.put('/:id', authenticateToken, requireRole(['admin', 'chief']), async (req, res) => {
  const userId = req.params.id;
  const { name, email, phone } = req.body;

  try {
    const existing = await query('SELECT role, group_id, name FROM users WHERE id = ?', [userId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Role check: Chiefs can only update members within their group
    if (req.user.role === 'chief') {
      if (existing[0].role !== 'member' || existing[0].group_id !== req.user.group_id) {
        return res.status(403).json({ message: 'Unauthorized: Can only edit members in your own group' });
      }
    }

    await query('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?', [name, email, phone, userId]);

    await logAction(req.user.id, req.user.name, existing[0].group_id, 'Edit User Details', `Updated details for ${existing[0].name}`);

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('Edit User Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/users/:id/status - Suspend / Activate Member (Admin or Chief)
router.patch('/:id/status', authenticateToken, requireRole(['admin', 'chief']), async (req, res) => {
  const userId = req.params.id;
  const { status } = req.body; // active, suspended, inactive

  if (!['active', 'suspended', 'inactive'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const existing = await query('SELECT role, group_id, name FROM users WHERE id = ?', [userId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user.role === 'chief') {
      if (existing[0].role !== 'member' || existing[0].group_id !== req.user.group_id) {
        return res.status(403).json({ message: 'Unauthorized: Can only alter status of members in your own group' });
      }
    }

    await query('UPDATE users SET status = ? WHERE id = ?', [status, userId]);

    await logAction(req.user.id, req.user.name, existing[0].group_id, 'Change User Status', `Changed status of ${existing[0].name} to ${status}`);

    res.json({ message: `User status changed to ${status} successfully` });
  } catch (err) {
    console.error('Change Status Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/users/:id/transfer - Transfer member to another group (Admin only)
router.patch('/:id/transfer', authenticateToken, requireRole(['admin']), async (req, res) => {
  const userId = req.params.id;
  const { group_id } = req.body;

  try {
    const userCheck = await query('SELECT name, group_id FROM users WHERE id = ?', [userId]);
    if (userCheck.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const groupCheck = await query('SELECT name FROM \`groups\` WHERE id = ?', [group_id]);
    if (groupCheck.length === 0) {
      return res.status(404).json({ message: 'Target group not found' });
    }

    const oldGroupId = userCheck[0].group_id;

    // Update user's group
    await query('UPDATE users SET group_id = ? WHERE id = ?', [group_id, userId]);

    // Also update any pending contributions to the new group
    await query('UPDATE contributions SET group_id = ? WHERE member_id = ? AND status = \'pending\'', [group_id, userId]);

    await logAction(req.user.id, req.user.name, group_id, 'Transfer Member', `Transferred member ${userCheck[0].name} from Group ${oldGroupId} to Group ${groupCheck[0].name}`);

    res.json({ message: `Transferred ${userCheck[0].name} to ${groupCheck[0].name} successfully` });
  } catch (err) {
    console.error('Transfer Member Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/users/:id/reset-password - Reset password (Admin only or Chief for their member)
router.post('/:id/reset-password', authenticateToken, requireRole(['admin', 'chief']), async (req, res) => {
  const userId = req.params.id;

  try {
    const existing = await query('SELECT role, group_id, name, email FROM users WHERE id = ?', [userId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user.role === 'chief') {
      if (existing[0].role !== 'member' || existing[0].group_id !== req.user.group_id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    console.log(`[SMS/Email Notification] PASSWORD RESET FOR ${existing[0].name} (Email: ${existing[0].email}, New Password: ${tempPassword})`);

    await logAction(req.user.id, req.user.name, existing[0].group_id, 'Reset Password', `Reset password for ${existing[0].name}`);

    res.json({
      tempPassword,
      message: `Password reset successfully. New temporary password: ${tempPassword}`
    });
  } catch (err) {
    console.error('Reset Password Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/users/:id - Delete Chief or Member (Admin only, or Chief for members)
router.delete('/:id', authenticateToken, requireRole(['admin', 'chief']), async (req, res) => {
  const userId = req.params.id;

  try {
    const existing = await query('SELECT role, group_id, name FROM users WHERE id = ?', [userId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user.role === 'chief') {
      if (existing[0].role !== 'member' || existing[0].group_id !== req.user.group_id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
    }

    await query('DELETE FROM users WHERE id = ?', [userId]);

    await logAction(req.user.id, req.user.name, existing[0].group_id, 'Delete User', `Deleted user ${existing[0].name} (Role: ${existing[0].role})`);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete User Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
