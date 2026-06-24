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
  purchasedCareer?: boolean;
  purchasedSharedCockpit?: boolean;
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
    purchasedCareer: false,
    purchasedSharedCockpit: false,
  };

  await ref.set(user);
  res.status(201).json({ ...user, isPro: true, hasCareer: true, hasSharedCockpit: true });
});

// GET /api/auth/me — get current user profile
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { uid } = req.user!;
  const doc = await db().collection('users').doc(uid).get();

  if (!doc.exists) {
    res.status(404).json({ error: 'User profile not found. Register first.' });
    return;
  }

  const data = doc.data()!;
  const joinedAtDate = data.joinedAt?.toDate ? data.joinedAt.toDate() : new Date();
  const isTrial = (Date.now() - joinedAtDate.getTime()) < 30 * 24 * 60 * 60 * 1000;

  const hasCareer = isTrial || data.purchasedCareer === true;
  const hasSharedCockpit = isTrial || data.purchasedSharedCockpit === true;

  res.json({
    ...data,
    isTrial,
    isPro: isTrial, // for backward compatibility
    hasCareer,
    hasSharedCockpit,
  });
});

// POST /api/auth/purchase — purchase a feature
router.post('/purchase', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { uid } = req.user!;
  const { feature } = req.body;

  if (feature !== 'career' && feature !== 'cockpit') {
    res.status(400).json({ error: "Invalid feature. Must be 'career' or 'cockpit'" });
    return;
  }

  const ref = db().collection('users').doc(uid);
  const doc = await ref.get();
  if (!doc.exists) {
    res.status(404).json({ error: 'User profile not found' });
    return;
  }

  const updateData: Record<string, boolean> = {};
  if (feature === 'career') {
    updateData.purchasedCareer = true;
  } else {
    updateData.purchasedSharedCockpit = true;
  }

  await ref.update(updateData);
  res.json({ success: true, ...doc.data(), ...updateData });
});

export default router;
