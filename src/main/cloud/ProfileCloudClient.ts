// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Cloud Profile API Client (Electron)
// ═══════════════════════════════════════════════════════

import type { AircraftProfile, ControlMapping } from '../../shared/types';
import type { FirebaseAuthManager } from './FirebaseAuthManager';

const API_BASE = process.env.CLOUD_PROFILES_URL ?? 'http://localhost:8080';

// ── API response types ──

export interface ProfileInfo {
  id: string;
  aircraftTitle: string;
  version: number;
  author: string;
  authorId: string;
  rating: number;
  ratingCount: number;
  downloads: number;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProfileListResponse {
  profiles: ProfileInfo[];
  count: number;
  limit: number;
  offset: number;
}

interface UploadResponse {
  id: string;
  aircraftTitle: string;
}

export class ProfileCloudClient {
  constructor(private auth: FirebaseAuthManager) {}

  // ── Search profiles by aircraft title ──

  async searchProfiles(
    aircraftTitle: string,
    opts: { limit?: number; offset?: number } = {}
  ): Promise<ProfileInfo[]> {
    const params = new URLSearchParams({ aircraft: aircraftTitle });
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.offset) params.set('offset', String(opts.offset));

    const res = await this.fetch(`/api/profiles?${params}`);
    const body = (await res.json()) as ProfileListResponse;
    return body.profiles;
  }

  // ── Download a full profile ──

  async downloadProfile(id: string): Promise<AircraftProfile> {
    const res = await this.fetch(`/api/profiles/${id}/download`);
    return (await res.json()) as AircraftProfile;
  }

  // ── Upload a new profile ──

  async uploadProfile(profile: AircraftProfile): Promise<UploadResponse> {
    const res = await this.fetch('/api/profiles', {
      method: 'POST',
      body: JSON.stringify({
        aircraftTitle: profile.aircraftTitle,
        version: profile.version,
        mappings: profile.mappings,
        verified: profile.verified,
      }),
    });
    return (await res.json()) as UploadResponse;
  }

  // ── Rate a profile ──

  async rateProfile(id: string, stars: number): Promise<void> {
    await this.fetch(`/api/profiles/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ stars }),
    });
  }

  // ── Get popular profiles ──

  async getPopularProfiles(limit = 20): Promise<ProfileInfo[]> {
    const res = await this.fetch(`/api/profiles/popular?limit=${limit}`);
    const body = (await res.json()) as { profiles: ProfileInfo[]; count: number };
    return body.profiles;
  }

  // ── Get single profile metadata ──

  async getProfile(id: string): Promise<ProfileInfo & { mappings: ControlMapping[] }> {
    const res = await this.fetch(`/api/profiles/${id}`);
    return (await res.json()) as ProfileInfo & { mappings: ControlMapping[] };
  }

  // ── Internal fetch wrapper ──

  private async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string>),
    };

    // Attach auth token if available
    try {
      const token = await this.auth.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // Unauthenticated request — some endpoints allow this
    }

    const url = `${API_BASE}${path}`;
    const res = await globalThis.fetch(url, { ...init, headers });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = (body as { error?: string }).error ?? res.statusText;
      throw new CloudApiError(msg, res.status);
    }

    return res;
  }
}

export class CloudApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'CloudApiError';
  }
}
