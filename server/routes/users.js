const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Search users
router.get('/search', auth, async (req, res) => {
  const { query } = req.query;
  const userId = req.user.id;

  try {
    const users = await db.query(
      'SELECT id, username, avatar_url, status FROM users WHERE (username ILIKE $1 OR email ILIKE $1) AND id != $2 LIMIT 10',
      [`%${query}%`, userId]
    );
    res.json(users.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
