export const SECTION_TO_WIZARD_STEP: Record<string, number> = {
  personal: 1,
  basic: 1,
  family: 2,
  guardian: 2,
  academics: 3,
  academic: 3,
  documents: 4,
  docs: 4,
  sensitive: 5,
  aadhaar: 5,
  medical: 6,
  transport: 7,
  fees: 8,
  fee: 8,
  review: 9,
};

export const STEP_TITLES = [
  "Basic Info",
  "Guardian & Family",
  "Academic & Class",
  "Documents Vault",
  "Sensitive Identity",
  "Medical Details",
  "Transport",
  "Fee Assignment",
  "Review & Submit",
] as const;

export const STEP_DESCRIPTIONS = [
  "Student legal name, date of birth, gender, and student registry identifiers",
  "Father, mother, legal guardian, contacts, WhatsApp consent, and addresses",
  "Class placement, section, admission date, type, and previous school details",
  "Mandatory and optional identity and academic certificate verification vault",
  "Aadhaar compliance, masked display, and AES-256 encrypted sensitive storage",
  "Emergency health instructions, allergies, and special medical conditions",
  "School bus route, pickup/drop-off stop, and transportation preferences",
  "Tuition fee structure assignment and concession policy allocation",
  "Comprehensive verification and atomic commitment of student record",
] as const;

export function resolveWizardStep(stepOrSection: string | number | null | undefined): number {
  if (!stepOrSection) return 1;
  if (typeof stepOrSection === "number") {
    return Math.max(1, Math.min(9, Math.floor(stepOrSection)));
  }
  const numeric = parseInt(stepOrSection, 10);
  if (!isNaN(numeric) && numeric >= 1 && numeric <= 9) {
    return numeric;
  }
  const normalized = stepOrSection.toLowerCase().trim();
  if (normalized in SECTION_TO_WIZARD_STEP) {
    return SECTION_TO_WIZARD_STEP[normalized];
  }
  return 1;
}
