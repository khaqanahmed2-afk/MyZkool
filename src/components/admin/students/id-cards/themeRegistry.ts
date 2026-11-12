import { IdCardThemeDefinition } from "./types";
import { ModernBlueYellowTheme } from "./themes/ModernBlueYellowTheme";
import { MinimalBlueWhiteTheme } from "./themes/MinimalBlueWhiteTheme";

export const ID_CARD_THEMES: Record<string, IdCardThemeDefinition> = {
  modern_blue_yellow: {
    id: "modern_blue_yellow",
    name: "Modern Blue & Yellow",
    description: "Royal blue background with elegant golden-yellow geometric accents, prominent photo framing, and verified badge.",
    category: "modern",
    previewBadge: "Recommended",
    defaultPrimaryColor: "#1E3A8A",
    defaultSecondaryColor: "#EAB308",
    supportsCustomColors: true,
    Component: ModernBlueYellowTheme,
  },
  minimal_blue_white: {
    id: "minimal_blue_white",
    name: "Minimal Blue & White",
    description: "Clean, ultra-crisp typographic layout with sapphire highlights, vector barcode integration, and structured back layout.",
    category: "minimal",
    previewBadge: "Minimalist",
    defaultPrimaryColor: "#2563EB",
    defaultSecondaryColor: "#F1F5F9",
    supportsCustomColors: false,
    Component: MinimalBlueWhiteTheme,
  },
};

export const THEME_LIST = Object.values(ID_CARD_THEMES);

export function getThemeDefinition(themeId: string): IdCardThemeDefinition {
  return ID_CARD_THEMES[themeId] || ID_CARD_THEMES.modern_blue_yellow;
}
