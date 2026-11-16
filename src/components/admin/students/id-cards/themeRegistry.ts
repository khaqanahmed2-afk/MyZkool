import { IdCardThemeDefinition } from "./types";
import { ModernBlueYellowTheme } from "./themes/ModernBlueYellowTheme";
import { MinimalBlueWhiteTheme } from "./themes/MinimalBlueWhiteTheme";

export const ID_CARD_THEMES: Record<string, IdCardThemeDefinition> = {
  modern_blue_yellow: {
    id: "modern_blue_yellow",
    name: "Bold blue & yellow",
    description: "Blue-and-yellow card matching the supplied bold design.",
    category: "modern",
    previewBadge: "Recommended",
    defaultPrimaryColor: "#2158E0",
    defaultSecondaryColor: "#FACC15",
    supportsCustomColors: true,
    Component: ModernBlueYellowTheme,
  },
  minimal_blue_white: {
    id: "minimal_blue_white",
    name: "Blue shades",
    description: "MyZkool-blue card matching the supplied blue-shades design.",
    category: "minimal",
    previewBadge: "Minimalist",
    defaultPrimaryColor: "#2158E0",
    defaultSecondaryColor: "#DBEAFE",
    supportsCustomColors: false,
    Component: MinimalBlueWhiteTheme,
  },
};

export const THEME_LIST = Object.values(ID_CARD_THEMES);

export function getThemeDefinition(themeId: string): IdCardThemeDefinition {
  return ID_CARD_THEMES[themeId] || ID_CARD_THEMES.minimal_blue_white;
}
