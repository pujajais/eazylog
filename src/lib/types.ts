// ── Auth / Profile ────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

// ── Symptom entry (existing Supabase table) ───────────────────────────────────

export interface SymptomEntry {
  id: string;
  user_id: string;
  raw_text: string | null;
  body_locations: string[];
  pain_type: string | null;
  severity: number | null;
  triggers: string[];
  is_chronic: boolean;
  notes: string | null;
  source: 'log' | 'quick-tap' | 'body-map';
  created_at: string;
}

// ── Other app tables ──────────────────────────────────────────────────────────

export interface QuickTapPreset {
  id: string;
  user_id: string;
  label: string;
  icon: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface FollowUp {
  id: string;
  entry_id: string;
  question: string;
  answer: string | null;
  created_at: string;
}

export interface DoctorReport {
  id: string;
  user_id: string;
  report_text: string;
  date_range_start: string | null;
  date_range_end: string | null;
  created_at: string;
}

// ── Legacy single-step parse (used by dashboard) ─────────────────────────────

export interface ParsedSymptom {
  body_locations: string[];
  pain_type: string;
  severity: number;
  triggers: string[];
  is_chronic: boolean;
  summary: string;
  is_emergency: boolean;
  emergency_message?: string;
  follow_up_questions: string[];
}

// ── NEW: Multi-step extraction pipeline ──────────────────────────────────────

export type FieldStatus = 'extracted' | 'missing';

export interface ExtractionField<T> {
  value: T;
  status: FieldStatus;
}

/**
 * Returned by /api/extract-symptom (Claude Haiku).
 * Every field is either "extracted" from the user's words or "missing".
 * Nothing is guessed or inferred.
 */
export interface ExtractionResult {
  body_region: ExtractionField<string | null>;
  specific_location: ExtractionField<string | null>;
  symptom_type: ExtractionField<string | null>;
  severity: ExtractionField<number | null>;
  onset: ExtractionField<string | null>;
  pain_quality: ExtractionField<string[]>;
  pattern: ExtractionField<string | null>;
  duration: ExtractionField<string | null>;
  triggers: ExtractionField<string[]>;
  accompanying: ExtractionField<string[]>;
  raw_input: string;
  is_emergency: boolean;
  emergency_type?: string;
  emergency_message?: string;
}

/**
 * One follow-up question with tappable chip options.
 * Returned by /api/generate-followups (Claude Sonnet).
 */
export interface FollowUpQuestion {
  field: string;          // which ExtractionResult key this fills
  required: boolean;
  text: string;           // natural language question
  options: string[];      // tappable chips
}

/**
 * Full response from /api/generate-followups.
 */
export interface FollowUpResult {
  questions: FollowUpQuestion[];
  has_history_match: boolean;
  history_note?: string;
}

/**
 * Runtime state accumulated on the /log page while the user
 * progresses through the pipeline.
 */
export interface LogSession {
  rawInput: string;
  extraction: ExtractionResult;
  history: HistoryEntry[];
  followUps: FollowUpQuestion[];
  historyNote?: string;
}

export interface HistoryEntry {
  id: string;
  created_at: string;
  body_locations: string[];
  pain_type: string | null;
  severity: number | null;
}
