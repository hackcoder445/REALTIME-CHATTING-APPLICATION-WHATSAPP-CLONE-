const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Get all conversations for current user
router.get('/', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const conversations = await db.query(
      `SELECT c.*, 
        (SELECT JSON_AGG(u.*) FROM users u 
         JOIN participants p ON u.id = p.user_id 
         WHERE p.conversation_id = c.id AND u.id != $1) as other_users,
        (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*)::int FROM messages m WHERE m.conversation_id = c.id AND m.is_read = false AND m.sender_id != $1) as unread_count
       FROM conversations c
       JOIN participants p ON c.id = p.conversation_id
       WHERE p.user_id = $1
       ORDER BY last_message_time DESC NULLS LAST`,
      [userId]
    );
    res.json(conversations.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Create new conversation (private chat)
router.post('/', auth, async (req, res) => {
  const { participantId } = req.body;
  const userId = req.user.id;

  try {
    // Check if conversation already exists (for private chats)
    const existing = await db.query(
      `SELECT p1.conversation_id 
       FROM participants p1 
       JOIN participants p2 ON p1.conversation_id = p2.conversation_id 
       JOIN conversations c ON p1.conversation_id = c.id
       WHERE p1.user_id = $1 AND p2.user_id = $2 AND c.is_group = false`,
      [userId, participantId]
    );

    if (existing.rows.length > 0) {
      return res.json({ id: existing.rows[0].conversation_id });
    }

    // Create new conversation
    const newConv = await db.query('INSERT INTO conversations (is_group) VALUES (false) RETURNING id');
    const convId = newConv.rows[0].id;

    // Add participants
    await db.query('INSERT INTO participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)', [convId, userId, participantId]);

    res.json({ id: convId });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Get messages for a conversation
router.get('/:id/messages', auth, async (req, res) => {
  const convId = req.params.id;

  try {
    const messages = await db.query(
      'SELECT m.*, u.username as sender_name FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.conversation_id = $1 ORDER BY m.created_at ASC',
      [convId]
    );
    res.json(messages.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Mark all messages as read in a conversation
router.post('/:id/read', auth, async (req, res) => {
  const convId = req.params.id;
  const userId = req.user.id;

  try {
    await db.query(
      'UPDATE messages SET is_read = true WHERE conversation_id = $1 AND sender_id != $2',
      [convId, userId]
    );
    res.json({ message: 'Messages marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
