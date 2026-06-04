const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { authenticateToken, logAction, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const users = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];
    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Your account is inactive. Contact administrator.' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, group_id: user.group_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Audit log
    await logAction(user.id, user.name, user.group_id, 'Login', `${user.name} logged into the system`);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        group_id: user.group_id,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const users = await query('SELECT id, name, email, phone, role, status, group_id, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(users[0]);
  } catch (err) {
    console.error('Profile Fetch Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new passwords are required' });
  }

  try {
    const users = await query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, req.user.id]);

    await logAction(req.user.id, req.user.name, req.user.group_id, 'Change Password', 'User updated their password');

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change Password Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
