import { IdCardThemeDefinition } from "./types";
import { ModernBlueYellowTheme } from "./themes/ModernBlueYellowTheme";
import { MinimalBlueWhiteTheme } from "./themes/MinimalBlueWhiteTheme";

export const ID_CARD_THEMES: Record<string, IdCardThemeDefinition> = {
  modern_blue_yellow: {
    id: "modern_blue_yellow",
    name: "Bold Blue & Yellow",
    description: "Deep navy blue and sunny yellow theme matching the official reference ID card design.",
    category: "modern",
    previewBadge: "Recommended",
    defaultPrimaryColor: "#0F2C59",
    defaultSecondaryColor: "#FBBF24",
    supportsCustomColors: true,
    Component: ModernBlueYellowTheme,
  },
  minimal_blue_white: {
    id: "minimal_blue_white",
    name: "Blue Shades",
    description: "MyZkool royal blue and soft pastel sky-blue theme matching the clean dual-shade design.",
    category: "minimal",
    previewBadge: "Minimalist",
    defaultPrimaryColor: "#1E40AF",
    defaultSecondaryColor: "#93C5FD",
    supportsCustomColors: true,
    Component: MinimalBlueWhiteTheme,
  },
};

export const THEME_LIST = Object.values(ID_CARD_THEMES);

export function getThemeDefinition(themeId: string): IdCardThemeDefinition {
  return ID_CARD_THEMES[themeId] || ID_CARD_THEMES.modern_blue_yellow;
}
