// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Firebase Auth Manager (Electron)
// ═══════════════════════════════════════════════════════

import { BrowserWindow } from 'electron';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  User,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCustomToken,
  signOut as fbSignOut,
  onAuthStateChanged,
  Unsubscribe,
} from 'firebase/auth';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { app as electronApp } from 'electron';

// ── Firebase config — loaded from environment or bundled config ──
const FIREBASE_CONFIG = {
  apiKey: process.env.FIREBASE_API_KEY ?? '',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.FIREBASE_APP_ID ?? '',
};

const TOKEN_FILE = path.join(electronApp.getPath('userData'), '.auth_refresh');

export type AuthProvider = 'google' | 'microsoft' | 'discord';

export interface AuthState {
  user: { uid: string; displayName: string | null; email: string | null } | null;
  loading: boolean;
}

type AuthListener = (state: AuthState) => void;

export class FirebaseAuthManager {
  private app: FirebaseApp;
  private auth: Auth;
  private listeners: AuthListener[] = [];
  private unsubscribe: Unsubscribe | null = null;

  constructor() {
    this.app = initializeApp(FIREBASE_CONFIG);
    this.auth = getAuth(this.app);
    this.setupAuthListener();
    this.tryRestoreSession();
  }

  // ── Public API ──

  async signIn(provider: AuthProvider): Promise<User> {
    switch (provider) {
      case 'google':
        return this.signInWithOAuthPopup(new GoogleAuthProvider());
      case 'microsoft':
        return this.signInWithOAuthPopup(new OAuthProvider('microsoft.com'));
      case 'discord':
        return this.signInWithDiscord();
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  async signOut(): Promise<void> {
    await fbSignOut(this.auth);
    this.clearStoredToken();
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  async getIdToken(): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return user.getIdToken();
  }

  onAuthStateChanged(listener: AuthListener): () => void {
    this.listeners.push(listener);

    // Emit current state immediately
    const user = this.auth.currentUser;
    listener({
      user: user ? { uid: user.uid, displayName: user.displayName, email: user.email } : null,
      loading: false,
    });

    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  destroy(): void {
    this.unsubscribe?.();
  }

  // ── OAuth popup flow (Google, Microsoft) ──

  private async signInWithOAuthPopup(provider: GoogleAuthProvider | OAuthProvider): Promise<User> {
    const providerId = provider instanceof GoogleAuthProvider ? 'google.com' : 'microsoft.com';

    const scopes: Record<string, string[]> = {
      'google.com': ['email', 'profile'],
      'microsoft.com': ['openid', 'email', 'profile'],
    };
    const providerScopes = scopes[providerId] ?? [];

    // Build OAuth URL
    const redirectUri = 'https://aerosphere.firebaseapp.com/__/auth/handler';
    const params = new URLSearchParams({
      client_id: FIREBASE_CONFIG.apiKey,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: providerScopes.join(' '),
    });

    const authUrls: Record<string, string> = {
      'google.com': `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      'microsoft.com': `https://login.microsoftonline.com/common/oauth2/v2/authorize?${params}`,
    };

    const authUrl = authUrls[providerId];
    if (!authUrl) throw new Error(`No auth URL for provider ${providerId}`);

    const accessToken = await this.openOAuthWindow(authUrl, redirectUri);

    // Exchange for Firebase credential
    const credential =
      providerId === 'google.com'
        ? GoogleAuthProvider.credential(null, accessToken)
        : OAuthProvider.credentialFromJSON({ providerId, accessToken });

    if (!credential) throw new Error('Failed to create credential');
    const result = await signInWithCredential(this.auth, credential);
    this.storeRefreshToken(result.user);
    return result.user;
  }

  private openOAuthWindow(authUrl: string, redirectUri: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const win = new BrowserWindow({
        width: 520,
        height: 720,
        show: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });

      win.webContents.on('will-redirect', (_event, url) => {
        if (url.startsWith(redirectUri) || url.includes('access_token=')) {
          const hash = new URL(url).hash.slice(1);
          const params = new URLSearchParams(hash);
          const token = params.get('access_token');
          if (token) {
            resolve(token);
            win.close();
          }
        }
      });

      win.on('closed', () => reject(new Error('Auth window closed by user')));
      win.loadURL(authUrl);
    });
  }

  // ── Discord OAuth (custom token flow) ──

  private async signInWithDiscord(): Promise<User> {
    const discordClientId = process.env.DISCORD_CLIENT_ID ?? '';
    const redirectUri = 'http://localhost:65432/discord-callback';
    const scope = 'identify email';

    const authUrl =
      `https://discord.com/api/oauth2/authorize?` +
      `client_id=${discordClientId}&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code&scope=${encodeURIComponent(scope)}`;

    const code = await this.openDiscordWindow(authUrl, redirectUri);

    // Exchange code for custom Firebase token via our Cloud Run API
    const apiBase = process.env.CLOUD_PROFILES_URL ?? 'http://localhost:8080';
    const resp = await fetch(`${apiBase}/api/auth/discord-exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri }),
    });

    if (!resp.ok) throw new Error('Discord token exchange failed');
    const { customToken } = (await resp.json()) as { customToken: string };

    const result = await signInWithCustomToken(this.auth, customToken);
    this.storeRefreshToken(result.user);
    return result.user;
  }

  private openDiscordWindow(authUrl: string, redirectUri: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const win = new BrowserWindow({
        width: 520,
        height: 720,
        show: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });

      win.webContents.on('will-redirect', (_event, url) => {
        if (url.startsWith(redirectUri)) {
          const code = new URL(url).searchParams.get('code');
          if (code) {
            resolve(code);
            win.close();
          }
        }
      });

      win.on('closed', () => reject(new Error('Discord auth window closed')));
      win.loadURL(authUrl);
    });
  }

  // ── Persistent session ──

  private setupAuthListener(): void {
    this.unsubscribe = onAuthStateChanged(this.auth, (user) => {
      const state: AuthState = {
        user: user
          ? { uid: user.uid, displayName: user.displayName, email: user.email }
          : null,
        loading: false,
      };
      for (const listener of this.listeners) listener(state);
    });
  }

  private storeRefreshToken(user: User): void {
    try {
      fs.writeFileSync(TOKEN_FILE, user.refreshToken, 'utf-8');
    } catch {
      // Non-critical — session just won't persist
    }
  }

  private clearStoredToken(): void {
    try {
      if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
    } catch {
      // Ignore cleanup errors
    }
  }

  private async tryRestoreSession(): Promise<void> {
    try {
      if (!fs.existsSync(TOKEN_FILE)) return;
      // Firebase Auth SDK auto-restores from IndexedDB/persistence in most cases.
      // The refresh token file is a fallback for cold starts.
      // The SDK will pick up the persisted session on its own.
    } catch {
      // Silent failure — user will need to re-authenticate
    }
  }
}
