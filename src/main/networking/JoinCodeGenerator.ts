// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Join Code Generator
// ═══════════════════════════════════════════════════════

import { randomBytes } from 'node:crypto';
import { JOIN_CODE_CHARS, JOIN_CODE_LENGTH } from '../../shared/constants';

export function generate(): string {
  const bytes = randomBytes(JOIN_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += JOIN_CODE_CHARS[bytes[i] % JOIN_CODE_CHARS.length];
  }
  return code;
}

export function validate(code: string): boolean {
  if (code.length !== JOIN_CODE_LENGTH) return false;
  return [...code].every(c => JOIN_CODE_CHARS.includes(c));
}
