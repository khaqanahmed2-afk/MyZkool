/**
 * Central asset registry for MyZkool.
 * Canonical paths for static public images, branding logos and illustrations.
 */

export const ASSETS = {
  BRAND: {
    LOGO: '/logo.svg',
    FAVICON: '/favicon.svg',
  },
  MOCKUPS: {
    HERO_LAPTOP: '/hero-laptop.webp',
    PARENT_MOBILE: '/myzkoolp.webp',
  },
  FOUNDERS: {
    KHAQAN: '/Khaqan%20Ahmad.webp',
    AHIRI: '/Ahiri%20Naskar.webp',
    AQSA: '/Aqsa%20Ibrahim.webp',
  },
} as const;

export default ASSETS;
