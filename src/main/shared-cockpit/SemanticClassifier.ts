// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Semantic Classifier
// Fuzzy variable-name → canonical-control mapper
// ═══════════════════════════════════════════════════════

export interface ClassifyResult {
  name: string;
  confidence: number;
  category: ControlCategory;
}

export type ControlCategory =
  | 'lights' | 'flight' | 'engine' | 'system'
  | 'radio' | 'autopilot' | 'navigation' | 'cabin';

interface CanonicalRule {
  patterns: string[];
  category: ControlCategory;
}

// ── 55+ canonical control rules ──
export const CANONICAL_RULES: Record<string, CanonicalRule> = {
  // ── Lights ──
  LANDING_LIGHTS:        { patterns: ['*LDG_LT*', '*LANDING_LIGHT*', '*LIGHT_LANDING*'], category: 'lights' },
  TAXI_LIGHTS:           { patterns: ['*TAXI_LT*', '*TAXI_LIGHT*', '*LIGHT_TAXI*'], category: 'lights' },
  NAV_LIGHTS:            { patterns: ['*NAV_LT*', '*NAV_LIGHT*', '*LIGHT_NAV*'], category: 'lights' },
  BEACON_LIGHTS:         { patterns: ['*BEACON*LT*', '*BEACON_LIGHT*', '*LIGHT_BEACON*', '*BCN_LT*'], category: 'lights' },
  STROBE_LIGHTS:         { patterns: ['*STROBE*', '*STRB_LT*', '*LIGHT_STROBE*'], category: 'lights' },
  WING_LIGHTS:           { patterns: ['*WING_LT*', '*WING_LIGHT*', '*LIGHT_WING*'], category: 'lights' },
  LOGO_LIGHTS:           { patterns: ['*LOGO_LT*', '*LOGO_LIGHT*', '*LIGHT_LOGO*'], category: 'lights' },
  RUNWAY_TURNOFF_LIGHTS: { patterns: ['*RWY_TURNOFF*', '*TURNOFF_LIGHT*', '*LIGHT_TURNOFF*'], category: 'lights' },
  DOME_LIGHT:            { patterns: ['*DOME_LT*', '*DOME_LIGHT*', '*LIGHT_DOME*'], category: 'lights' },
  PANEL_LIGHTS:          { patterns: ['*PANEL_LT*', '*PANEL_LIGHT*', '*LIGHT_PANEL*'], category: 'lights' },
  PEDESTAL_LIGHTS:       { patterns: ['*PED_LT*', '*PEDESTAL_LIGHT*'], category: 'lights' },
  FLOOD_LIGHTS:          { patterns: ['*FLOOD_LT*', '*FLOOD_LIGHT*'], category: 'lights' },

  // ── Flight Controls ──
  GEAR_HANDLE:    { patterns: ['*GEAR_HANDLE*', '*GEAR_LEVER*', '*GEAR_CTL*', '*GEAR_POSITION*CTL*'], category: 'flight' },
  FLAPS:          { patterns: ['*FLAP*HANDLE*', '*FLAPS_*', '*FLAP_POSITION*'], category: 'flight' },
  SPOILERS:       { patterns: ['*SPOILER*', '*SPEED_BRAKE*', '*SPD_BRK*'], category: 'flight' },
  PARKING_BRAKE:  { patterns: ['*PARK*BRAKE*', '*PKG_BRK*', '*PARKING_BRK*'], category: 'flight' },
  AUTOBRAKE:      { patterns: ['*AUTOBRAKE*', '*AUTO_BRAKE*', '*A_BRK*'], category: 'flight' },
  TRIM_ELEVATOR:  { patterns: ['*ELEVATOR_TRIM*', '*PITCH_TRIM*', '*STAB_TRIM*'], category: 'flight' },
  TRIM_AILERON:   { patterns: ['*AILERON_TRIM*', '*ROLL_TRIM*'], category: 'flight' },
  TRIM_RUDDER:    { patterns: ['*RUDDER_TRIM*', '*YAW_TRIM*'], category: 'flight' },

  // ── Engine ──
  ENGINE_STARTER_1: { patterns: ['*ENG*1*START*', '*STARTER_1*', '*ENG_STARTER_1*', '*ENG_START_1*'], category: 'engine' },
  ENGINE_STARTER_2: { patterns: ['*ENG*2*START*', '*STARTER_2*', '*ENG_STARTER_2*', '*ENG_START_2*'], category: 'engine' },
  ENGINE_STARTER_3: { patterns: ['*ENG*3*START*', '*STARTER_3*'], category: 'engine' },
  ENGINE_STARTER_4: { patterns: ['*ENG*4*START*', '*STARTER_4*'], category: 'engine' },
  ENGINE_MASTER_1:  { patterns: ['*ENG*1*MASTER*', '*ENG_MASTER_1*'], category: 'engine' },
  ENGINE_MASTER_2:  { patterns: ['*ENG*2*MASTER*', '*ENG_MASTER_2*'], category: 'engine' },
  FUEL_PUMP_1:      { patterns: ['*FUEL*PUMP*1*', '*FUEL_PUMP_L*', '*FUEL_PUMP_FWD_1*'], category: 'engine' },
  FUEL_PUMP_2:      { patterns: ['*FUEL*PUMP*2*', '*FUEL_PUMP_R*', '*FUEL_PUMP_FWD_2*'], category: 'engine' },
  FUEL_CROSSFEED:   { patterns: ['*CROSSFEED*', '*X_FEED*', '*XFEED*'], category: 'engine' },
  MIXTURE:          { patterns: ['*MIXTURE*', '*MIX_*'], category: 'engine' },
  PROP_RPM:         { patterns: ['*PROP_RPM*', '*PROPELLER*RPM*', '*PROPELLER*LEVER*'], category: 'engine' },
  THROTTLE:         { patterns: ['*THROTTLE*', '*THRTL*'], category: 'engine' },
  APU_MASTER:       { patterns: ['*APU_MASTER*', '*APU_START*', '*APU_SW*'], category: 'engine' },
  APU_BLEED:        { patterns: ['*APU_BLEED*'], category: 'engine' },
  IGNITION:         { patterns: ['*IGNITION*', '*IGN_SW*', '*IGN_SELECT*'], category: 'engine' },

  // ── Systems ──
  SEATBELT_SIGN:   { patterns: ['*SEATBELT*', '*SEAT_BELT*', '*FASTEN_BELT*'], category: 'system' },
  NO_SMOKING_SIGN: { patterns: ['*NO_SMOKING*', '*NO_SMOKE*'], category: 'system' },
  MASTER_CAUTION:  { patterns: ['*MASTER_CAUTION*', '*MSTR_CAUTION*'], category: 'system' },
  MASTER_WARNING:  { patterns: ['*MASTER_WARNING*', '*MSTR_WARNING*'], category: 'system' },
  PACK_1:          { patterns: ['*PACK*1*', '*PACK_L*'], category: 'system' },
  PACK_2:          { patterns: ['*PACK*2*', '*PACK_R*'], category: 'system' },
  BLEED_1:         { patterns: ['*BLEED*1*', '*BLEED_L*', '*BLEED_ENG_1*'], category: 'system' },
  BLEED_2:         { patterns: ['*BLEED*2*', '*BLEED_R*', '*BLEED_ENG_2*'], category: 'system' },
  HYD_PUMP_1:      { patterns: ['*HYD*PUMP*1*', '*HYD*GREEN*'], category: 'system' },
  HYD_PUMP_2:      { patterns: ['*HYD*PUMP*2*', '*HYD*BLUE*'], category: 'system' },
  HYD_PUMP_3:      { patterns: ['*HYD*PUMP*3*', '*HYD*YELLOW*'], category: 'system' },
  ELEC_GEN_1:      { patterns: ['*GEN*1*', '*GENERATOR_1*', '*ELEC_GEN_1*'], category: 'system' },
  ELEC_GEN_2:      { patterns: ['*GEN*2*', '*GENERATOR_2*', '*ELEC_GEN_2*'], category: 'system' },
  BATTERY_MASTER:  { patterns: ['*BATT*MASTER*', '*BATTERY_SW*', '*BAT_*SW*', '*ELEC_BAT*'], category: 'system' },
  WIPER:           { patterns: ['*WIPER*', '*WINDSHIELD_WIPER*'], category: 'system' },
  DOOR_MAIN:       { patterns: ['*DOOR*MAIN*', '*CABIN_DOOR*', '*PAX_DOOR*', '*DOOR_PAX*'], category: 'system' },
  DOOR_CARGO:      { patterns: ['*DOOR*CARGO*', '*CARGO_DOOR*', '*FWD_CARGO*'], category: 'system' },

  // ── Radio ──
  NAV1_FREQ:        { patterns: ['*NAV1*FREQ*', '*NAV_1*FREQ*', '*NAV_RADIO_1*', '*NAV_ACTIVE*1*'], category: 'radio' },
  NAV2_FREQ:        { patterns: ['*NAV2*FREQ*', '*NAV_2*FREQ*', '*NAV_RADIO_2*', '*NAV_ACTIVE*2*'], category: 'radio' },
  COM1_FREQ:        { patterns: ['*COM1*FREQ*', '*COM_1*FREQ*', '*COM_RADIO_1*', '*COM_ACTIVE*1*'], category: 'radio' },
  COM2_FREQ:        { patterns: ['*COM2*FREQ*', '*COM_2*FREQ*', '*COM_RADIO_2*', '*COM_ACTIVE*2*'], category: 'radio' },
  ADF1_FREQ:        { patterns: ['*ADF1*FREQ*', '*ADF_1*'], category: 'radio' },
  TRANSPONDER_CODE: { patterns: ['*TRANSPONDER*', '*XPNDR*', '*SQUAWK*'], category: 'radio' },

  // ── Autopilot ──
  AUTOPILOT_MASTER: { patterns: ['*AP_MASTER*', '*AUTOPILOT_1*', '*AP_ENGAGE*', '*AP_CMD*'], category: 'autopilot' },
  AUTOTHROTTLE:     { patterns: ['*ATHR*', '*AUTOTHROTTLE*', '*A_THR*', '*AT_ARM*', '*AUTOTHRUST*'], category: 'autopilot' },
  HEADING_BUG:      { patterns: ['*HDG_BUG*', '*HEADING_BUG*', '*AP_HDG*', '*MCP_HDG*', '*FCU_HDG*'], category: 'autopilot' },
  ALTITUDE_BUG:     { patterns: ['*ALT_BUG*', '*ALTITUDE_BUG*', '*AP_ALT*', '*MCP_ALT*', '*FCU_ALT*'], category: 'autopilot' },
  SPEED_BUG:        { patterns: ['*SPD_BUG*', '*SPEED_BUG*', '*AP_SPD*', '*MCP_IAS*', '*FCU_SPD*'], category: 'autopilot' },
  VS_BUG:           { patterns: ['*VS_BUG*', '*VERT_SPD*BUG*', '*AP_VS*', '*MCP_VS*', '*FCU_VS*'], category: 'autopilot' },
  NAV_MODE:         { patterns: ['*AP_NAV*', '*LNAV*', '*LOC_MODE*', '*MCP_LNAV*', '*FCU_LOC*'], category: 'autopilot' },
  APPROACH_MODE:    { patterns: ['*AP_APR*', '*APPR*', '*APP_MODE*', '*MCP_APP*', '*FCU_APPR*'], category: 'autopilot' },
  FD_SWITCH:        { patterns: ['*FLIGHT_DIR*', '*FD_SW*', '*FD_1*'], category: 'autopilot' },

  // ── Navigation ──
  BAROMETER_SETTING: { patterns: ['*BARO*', '*KOHLSMAN*', '*QNH*', '*ALTIMETER_SET*'], category: 'navigation' },
  COURSE_1:          { patterns: ['*OBS_1*', '*CRS_1*', '*COURSE_1*'], category: 'navigation' },
  COURSE_2:          { patterns: ['*OBS_2*', '*CRS_2*', '*COURSE_2*'], category: 'navigation' },
  FMS_1:             { patterns: ['*FMS*', '*MCDU*', '*CDU*'], category: 'navigation' },

  // ── Cabin ──
  CABIN_TEMP: { patterns: ['*CABIN_TEMP*', '*CAB_TEMP*'], category: 'cabin' },
  ECAM_PAGE:  { patterns: ['*ECAM*', '*SD_PAGE*', '*EICAS*'], category: 'cabin' },
};

// ── Compiled rule for runtime matching ──
interface CompiledRule {
  regexes: RegExp[];
  category: ControlCategory;
}

export default class SemanticClassifier {
  private readonly compiledRules: Map<string, CompiledRule>;

  constructor() {
    this.compiledRules = new Map();
    for (const [name, rule] of Object.entries(CANONICAL_RULES)) {
      const regexes = rule.patterns.map((glob) => {
        const escaped = glob
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*');
        return new RegExp(`^${escaped}$`, 'i');
      });
      this.compiledRules.set(name, { regexes, category: rule.category });
    }
  }

  /** Match a SimConnect variable name to its canonical control. */
  classify(varName: string): ClassifyResult {
    const upper = varName.toUpperCase();

    // Phase 1: Glob pattern match (high confidence)
    for (const [name, rule] of this.compiledRules) {
      if (rule.regexes.some((rx) => rx.test(upper))) {
        return { name, confidence: 1.0, category: rule.category };
      }
    }

    // Phase 2: Keyword overlap fallback
    let bestName = '';
    let bestScore = 0;
    let bestCategory: ControlCategory = 'system';

    for (const [name, rule] of this.compiledRules) {
      const score = this.keywordScore(upper, name);
      if (score > bestScore) {
        bestScore = score;
        bestName = name;
        bestCategory = rule.category;
      }
    }

    if (bestScore >= 0.4) {
      return { name: bestName, confidence: bestScore, category: bestCategory };
    }

    return { name: varName, confidence: 0, category: 'system' };
  }

  /** Batch classify multiple variable names. */
  classifyBatch(varNames: string[]): Map<string, ClassifyResult> {
    const results = new Map<string, ClassifyResult>();
    for (const v of varNames) {
      results.set(v, this.classify(v));
    }
    return results;
  }

  /** Keyword overlap: split both strings by _ and count shared tokens. */
  private keywordScore(varName: string, canonicalName: string): number {
    const varTokens = new Set(varName.split(/[_:]/));
    const canonTokens = canonicalName.split('_');
    const overlap = canonTokens.filter((t) => varTokens.has(t)).length;
    return overlap / Math.max(canonTokens.length, 1);
  }
}
