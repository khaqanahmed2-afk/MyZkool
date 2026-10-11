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
    HERO_LAPTOP: '/hero-laptop.png',
    PARENT_MOBILE: '/myzkoolp.png',
  },
  FOUNDERS: {
    KHAQAN: '/Khaqan%20Ahmad.jpg',
    AHIRI: '/Ahiri%20Naskar.png',
    AQSA: '/Aqsa%20Ibrahim.jpg',
  },
} as const;

export default ASSETS;
