// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Profile CRUD Routes
// ═══════════════════════════════════════════════════════

import { Router, Request, Response } from 'express';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { requireAuth, optionalAuth } from '../middleware/auth';

const router = Router();
const db = () => getFirestore('db-aerosphere');

const MAX_UPLOADS_PER_DAY = 10;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// ── Profile document schema ──
interface ProfileDoc {
  id: string;
  aircraftTitle: string;
  aircraftTitleLower: string; // case-insensitive search
  version: number;
  author: string;
  authorId: string;
  mappings: unknown[];
  rating: number;
  ratingCount: number;
  downloads: number;
  verified: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

// ── Helpers ──

function parsePagination(req: Request): { limit: number; offset: number } {
  const limit = Math.min(
    Math.max(parseInt(req.query.limit as string) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
  return { limit, offset };
}

async function checkRateLimit(uid: string): Promise<boolean> {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const snap = await db()
    .collection('profiles')
    .where('authorId', '==', uid)
    .where('createdAt', '>=', Timestamp.fromDate(dayStart))
    .count()
    .get();

  return snap.data().count < MAX_UPLOADS_PER_DAY;
}

// ── GET /api/profiles/popular — top-rated profiles ──
// Must be registered BEFORE the /:id route
router.get('/popular', async (_req: Request, res: Response): Promise<void> => {
  const { limit } = parsePagination(_req);

  const snap = await db()
    .collection('profiles')
    .orderBy('rating', 'desc')
    .orderBy('ratingCount', 'desc')
    .limit(limit)
    .get();

  const profiles = snap.docs.map((d) => {
    const data = d.data();
    const { mappings: _m, aircraftTitleLower: _l, ...rest } = data;
    return rest;
  });

  res.json({ profiles, count: profiles.length });
});

// ── GET /api/profiles?aircraft=<title> — search by aircraft ──
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { limit, offset } = parsePagination(req);
  const aircraft = (req.query.aircraft as string)?.toLowerCase().trim();

  let query: FirebaseFirestore.Query = db().collection('profiles');

  if (aircraft) {
    // Firestore prefix search — matches aircraftTitleLower starting with query
    query = query
      .where('aircraftTitleLower', '>=', aircraft)
      .where('aircraftTitleLower', '<=', aircraft + '\uf8ff')
      .orderBy('aircraftTitleLower');
  } else {
    query = query.orderBy('createdAt', 'desc');
  }

  const snap = await query.offset(offset).limit(limit).get();

  const profiles = snap.docs.map((d) => {
    const data = d.data();
    const { mappings: _m, aircraftTitleLower: _l, ...rest } = data;
    return rest;
  });

  res.json({ profiles, count: profiles.length, limit, offset });
});

// ── POST /api/profiles — upload a new profile ──
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { uid, displayName, email } = req.user!;
  const { aircraftTitle, version, mappings, verified } = req.body;

  if (!aircraftTitle || !Array.isArray(mappings) || mappings.length === 0) {
    res.status(400).json({ error: 'aircraftTitle and non-empty mappings[] are required' });
    return;
  }

  const allowed = await checkRateLimit(uid);
  if (!allowed) {
    res.status(429).json({ error: `Upload limit reached (${MAX_UPLOADS_PER_DAY}/day)` });
    return;
  }

  const ref = db().collection('profiles').doc();
  const now = FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp;

  const profile: ProfileDoc = {
    id: ref.id,
    aircraftTitle,
    aircraftTitleLower: aircraftTitle.toLowerCase(),
    version: version ?? 1,
    author: displayName ?? email ?? uid,
    authorId: uid,
    mappings,
    rating: 0,
    ratingCount: 0,
    downloads: 0,
    verified: verified === true,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(profile);

  // Bump user's profileCount
  await db()
    .collection('users')
    .doc(uid)
    .update({ profileCount: FieldValue.increment(1) });

  res.status(201).json({ id: ref.id, aircraftTitle });
});

// ── GET /api/profiles/:id — get specific profile ──
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const doc = await db().collection('profiles').doc(req.params.id as string).get();
  if (!doc.exists) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  const data = doc.data()!;
  const { aircraftTitleLower: _l, ...profile } = data;
  res.json(profile);
});

// ── GET /api/profiles/:id/download — download profile JSON ──
router.get('/:id/download', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const ref = db().collection('profiles').doc(req.params.id as string);
  const doc = await ref.get();
  if (!doc.exists) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  // Increment download count
  await ref.update({ downloads: FieldValue.increment(1) });

  const data = doc.data()!;
  const downloadPayload = {
    aircraftTitle: data.aircraftTitle,
    version: data.version,
    createdAt: data.createdAt,
    verified: data.verified,
    mappings: data.mappings,
  };

  res.setHeader('Content-Disposition', `attachment; filename="${data.aircraftTitle}.json"`);
  res.json(downloadPayload);
});

// ── POST /api/profiles/:id/rate — rate a profile (1-5 stars) ──
router.post('/:id/rate', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { uid } = req.user!;
  const { stars } = req.body;

  if (typeof stars !== 'number' || stars < 1 || stars > 5 || !Number.isInteger(stars)) {
    res.status(400).json({ error: 'stars must be an integer between 1 and 5' });
    return;
  }

  const profileRef = db().collection('profiles').doc(req.params.id as string);
  const ratingRef = profileRef.collection('ratings').doc(uid);

  await db().runTransaction(async (tx) => {
    const profileDoc = await tx.get(profileRef);
    if (!profileDoc.exists) throw new Error('not_found');

    const prev = await tx.get(ratingRef);
    const data = profileDoc.data()!;
    let { rating, ratingCount } = data as { rating: number; ratingCount: number };

    if (prev.exists) {
      // Update existing rating — recalculate weighted average
      const oldStars = prev.data()!.stars as number;
      const totalStars = rating * ratingCount - oldStars + stars;
      rating = ratingCount > 0 ? totalStars / ratingCount : stars;
    } else {
      // New rating
      const totalStars = rating * ratingCount + stars;
      ratingCount += 1;
      rating = totalStars / ratingCount;
    }

    tx.set(ratingRef, { stars, uid, updatedAt: FieldValue.serverTimestamp() });
    tx.update(profileRef, {
      rating: Math.round(rating * 100) / 100,
      ratingCount,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }).catch((err: Error) => {
    if (err.message === 'not_found') {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    throw err;
  });

  // Only send 200 if we haven't already responded with 404
  if (!res.headersSent) {
    res.json({ ok: true });
  }
});

export default router;
