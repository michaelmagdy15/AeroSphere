// ═══════════════════════════════════════════════════════
// AeroSphere Studio — MSFS 2024 AOB Patterns
// ═══════════════════════════════════════════════════════
// NOTE: These are placeholder patterns. Real AOB signatures
// must be extracted from the MSFS 2024 binary via disassembly.

export const MSFS2024_PATTERNS = {
  /** AOB signature that locates the graphics settings struct. */
  SETTINGS_AOB: '48 8B 05 ?? ?? ?? ?? 48 85 C0 74 ?? F3 0F 10 80',

  /**
   * Byte offset within the matched AOB where the RIP-relative
   * displacement begins (the ?? bytes after the opcode).
   */
  RIP_OFFSET: 3,

  /**
   * Offset applied after resolving the RIP-relative pointer
   * to reach the final settings base pointer.
   */
  PTR_OFFSET: 0x00,

  /** TLOD float sits at the start of the settings struct. */
  TLOD_OFFSET: 0x00,

  /** OLOD float is 4 bytes after TLOD. */
  OLOD_OFFSET: 0x04,

  /** Cloud quality float at +0x0C. */
  CLOUD_OFFSET: 0x0C,
} as const;
