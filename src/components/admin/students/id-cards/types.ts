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
