/**
 * Domain types for Academic Calendar and Academic Years setup
 */

export interface AcademicYear {
  id: string;
  school_id: string;
  start_year: number;
  end_year: number;
  label: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  is_current: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AcademicYearInput {
  start_year: number;
  end_year: number;
  label: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  is_current: boolean;
}

export interface AcademicYearValidationErrors {
  start_year?: string;
  end_year?: string;
  label?: string;
  start_date?: string;
  end_date?: string;
  general?: string;
}

export interface AcademicYearValidationResult {
  isValid: boolean;
  errors: AcademicYearValidationErrors;
}

export interface AcademicCalendarPreset {
  id: string;
  name: string;
  description: string;
  startMonth: number; // 1-12 (1 = Jan, 4 = Apr, etc.)
  startDay: number;
  endMonth: number;
  endDay: number;
}

export const ACADEMIC_CALENDAR_PRESETS: AcademicCalendarPreset[] = [
  {
    id: "apr_mar",
    name: "April – March",
    description: "Standard Indian school cycle (CBSE, ICSE, State Boards)",
    startMonth: 4,
    startDay: 1,
    endMonth: 3,
    endDay: 31,
  },
  {
    id: "jun_may",
    name: "June – May",
    description: "South Indian & Regional State Boards cycle",
    startMonth: 6,
    startDay: 1,
    endMonth: 5,
    endDay: 31,
  },
  {
    id: "jan_dec",
    name: "January – December",
    description: "Annual calendar year cycle",
    startMonth: 1,
    startDay: 1,
    endMonth: 12,
    endDay: 31,
  },
  {
    id: "sep_jun",
    name: "September – June",
    description: "International, IB & Cambridge school cycle",
    startMonth: 9,
    startDay: 1,
    endMonth: 6,
    endDay: 30,
  },
];
