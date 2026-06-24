// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Auth Routes
// ═══════════════════════════════════════════════════════

import { Router, Request, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { requireAuth } from '../middleware/auth';

const router = Router();
const db = () => getFirestore('db-aerosphere');

// ── User document schema ──
interface UserDoc {
  uid: string;
  displayName: string;
  email: string;
  profileCount: number;
  reputation: number;
  joinedAt: FirebaseFirestore.Timestamp;
}

// POST /api/auth/register — create user profile in Firestore
router.post('/register', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { uid, email, displayName } = req.user!;

  const ref = db().collection('users').doc(uid);
  const existing = await ref.get();
  if (existing.exists) {
    res.status(409).json({ error: 'User profile already exists' });
    return;
  }

  const user: UserDoc = {
    uid,
    displayName: displayName ?? email ?? uid,
    email: email ?? '',
    profileCount: 0,
    reputation: 0,
    joinedAt: FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
  };

  await ref.set(user);
  res.status(201).json(user);
});

// GET /api/auth/me — get current user profile
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { uid } = req.user!;
  const doc = await db().collection('users').doc(uid).get();

  if (!doc.exists) {
    res.status(404).json({ error: 'User profile not found. Register first.' });
    return;
  }

  res.json(doc.data());
});

export default router;
