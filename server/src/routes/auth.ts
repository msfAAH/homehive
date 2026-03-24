import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { getDb } from '../db/connection.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { wrapPublic as wrap, wrap as wrapAuth } from '../middleware/asyncWrap.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/signup - register with email/password
router.post('/signup', wrap(async (req, res) => {
  const sql = getDb();
  const { email, password, first_name, last_name } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`;
  if (existing.length > 0) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const password_hash = await bcrypt.hash(password, 12);
  const [user] = await sql`
    INSERT INTO users (email, password_hash, first_name, last_name)
    VALUES (${email.toLowerCase().trim()}, ${password_hash}, ${(first_name || '').trim()}, ${(last_name || '').trim()})
    RETURNING id, email, first_name, last_name, avatar_url, created_at
  `;

  const token = generateToken(user.id);
  res.status(201).json({ token, user });
}));

// POST /api/auth/login - login with email/password
router.post('/login', wrap(async (req, res) => {
  const sql = getDb();
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const [user] = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase().trim()}`;
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
}));

// POST /api/auth/google - authenticate with Google
router.post('/google', wrap(async (req, res) => {
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
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ error: 'Invalid Google token' });
      return;
    }

    const sql = getDb();
    const { email, given_name, family_name, picture, sub: googleId } = payload;

    let [user] = await sql`SELECT * FROM users WHERE google_id = ${googleId} OR email = ${email!.toLowerCase()}`;

    if (user) {
      if (!user.google_id) {
        await sql`UPDATE users SET google_id = ${googleId}, avatar_url = COALESCE(avatar_url, ${picture || null}), updated_at = NOW() WHERE id = ${user.id}`;
      }
    } else {
      [user] = await sql`
        INSERT INTO users (email, first_name, last_name, google_id, avatar_url)
        VALUES (${email!.toLowerCase()}, ${given_name || ''}, ${family_name || ''}, ${googleId}, ${picture || null})
        RETURNING *
      `;
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Google auth error:', msg);
    if (msg.includes('audience') || msg.includes('client_id')) {
      res.status(401).json({ error: 'Google token audience mismatch — check GOOGLE_CLIENT_ID' });
    } else if (msg.includes('expired') || msg.includes('Token used too late')) {
      res.status(401).json({ error: 'Google token expired — please try again' });
    } else {
      res.status(401).json({ error: `Google authentication failed: ${msg}` });
    }
  }
}));

// GET /api/auth/me - get current user
router.get('/me', authMiddleware, wrapAuth(async (req, res) => {
  const sql = getDb();
  const [user] = await sql`SELECT id, email, first_name, last_name, avatar_url, created_at FROM users WHERE id = ${req.userId}`;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(user);
}));

export default router;
