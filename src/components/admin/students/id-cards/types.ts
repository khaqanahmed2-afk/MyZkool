import React from "react";
import { EnrichedStudentIdCard, IdCardCustomization } from "../../../../services/idCardService";

export interface IdCardThemeProps {
  card: EnrichedStudentIdCard;
  customization: IdCardCustomization;
  side: "front" | "back";
  qrDataUrl?: string;
  isPrint?: boolean;
}

export interface IdCardThemeDefinition {
  id: string;
  name: string;
  description: string;
  category: "modern" | "minimal" | "classic";
  previewBadge: string;
  defaultPrimaryColor: string;
  defaultSecondaryColor: string;
  supportsCustomColors: boolean;
  Component: React.ComponentType<IdCardThemeProps>;
}

/**
 * Cleanly formats class and section into "CLASS 11 – SCIENCE" or "CLASS 5 – A",
 * preventing duplicate "CLASS CLASS" text and handling various input shapes.
 */
export function formatClassLabel(className?: string | null, sectionName?: string | null): string {
  if (!className && !sectionName) return "CLASS 11 – SCIENCE";
  const rawClass = (className || "").trim();
  // Strip leading "Class", "CLASS", "Grade", "GRADE", "Std", "STD"
  const strippedClass = rawClass.replace(/^(class|grade|std)\s*/i, "").trim();
  const classPart = strippedClass ? `CLASS ${strippedClass.toUpperCase()}` : "CLASS";
  const cleanSection = (sectionName || "").trim().toUpperCase();
  if (cleanSection) {
    const sanitizedSection = cleanSection.replace(/^[-–:\s]+/, "");
    return `${classPart} – ${sanitizedSection}`;
  }
  return classPart;
}
