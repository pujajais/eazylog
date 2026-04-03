export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

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
