const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// POST /register
router.post('/register', async (req, res) => {
  const { name, email, password, role, province, phone } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await db.query(
      'INSERT INTO users (id, name, email, password, role, province, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, email, hashedPassword, role, province, phone]
    );
    res.status(201).json({ id, name, email, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    if (user.is_blocked) {
      return res.status(403).json({ message: 'Account blocked: ' + user.blocked_reason });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, province: user.province },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, user: { id: user.id, name: user.name, role: user.role, province: user.province } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /me
router.get('/me', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, role, province, is_blocked, language FROM users WHERE id = ?', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /language — save user language preference
router.put('/language', auth, async (req, res) => {
  const { language } = req.body;
  if (!['en','si','ta'].includes(language)) return res.status(400).json({ error: 'Invalid language' });
  try {
    await db.query('UPDATE users SET language=? WHERE id=?', [language, req.user.id]);
    res.json({ message: 'Language preference saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
