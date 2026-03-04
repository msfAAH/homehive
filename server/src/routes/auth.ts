import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { getDb } from '../db/connection.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/signup - register with email/password
router.post('/signup', async (req, res) => {
  const db = getDb();
  const { email, password, first_name, last_name } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const password_hash = await bcrypt.hash(password, 12);
  const result = db.prepare(`
    INSERT INTO users (email, password_hash, first_name, last_name)
    VALUES (?, ?, ?, ?)
  `).run(
    email.toLowerCase().trim(),
    password_hash,
    (first_name || '').trim(),
    (last_name || '').trim(),
  );

  const user = db.prepare('SELECT id, email, first_name, last_name, avatar_url, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid) as any;

  const token = generateToken(user.id);
  res.status(201).json({ token, user });
});

// POST /api/auth/login - login with email/password
router.post('/login', async (req, res) => {
  const db = getDb();
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;
  if (!user || !user.password_hash) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = generateToken(user.id);
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
    },
  });
});

// POST /api/auth/google - authenticate with Google
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    res.status(400).json({ error: 'Google credential is required' });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(500).json({ error: 'Google Sign-In is not configured on the server' });
    return;
  }

  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ error: 'Invalid Google token' });
      return;
    }

    const db = getDb();
    const { email, given_name, family_name, picture, sub: googleId } = payload;

    // Check if user exists by google_id or email
    let user = db.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?').get(googleId, email!.toLowerCase()) as any;

    if (user) {
      // Update google_id and avatar if not set
      if (!user.google_id) {
        db.prepare('UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?), updated_at = datetime(\'now\') WHERE id = ?')
          .run(googleId, picture || null, user.id);
      }
    } else {
      // Create new user
      const result = db.prepare(`
        INSERT INTO users (email, first_name, last_name, google_id, avatar_url)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        email!.toLowerCase(),
        given_name || '',
        family_name || '',
        googleId,
        picture || null,
      );
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }

    const token = generateToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      },
    });
  } catch (err: any) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

// GET /api/auth/me - get current user
router.get('/me', authMiddleware, (req: AuthRequest, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, email, first_name, last_name, avatar_url, created_at FROM users WHERE id = ?')
    .get(req.userId) as any;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(user);
});

export default router;
