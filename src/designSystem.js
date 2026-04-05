export const DESIGN_BREAKPOINTS = {
  SMALL_MOBILE_MAX: 478,
  MOBILE_MAX: 640,
  LARGE_MOBILE_MAX: 767,
  TABLET_MAX: 991,
};

export const TYPOGRAPHY_BY_TIER = {
  smallMobile: {
    hero: 25.6,
    subtitle: 14,
    cardTitle: 17,
    sectionTitle: 25.6,
    body: 15,
  },
  mobile: {
    hero: 32,
    subtitle: 15,
    cardTitle: 20,
    sectionTitle: 32,
    body: 15,
  },
  largeMobile: {
    hero: 36,
    subtitle: 16,
    cardTitle: 20.8,
    sectionTitle: 36.8,
    body: 16,
  },
  tablet: {
    hero: 52,
    subtitle: 17,
    cardTitle: 23,
    sectionTitle: 52,
    body: 16,
  },
  desktop: {
    hero: 64,
    subtitle: 20,
    cardTitle: 25.6,
    sectionTitle: 52,
    body: 16,
  },
};

export const SPACING_BY_TIER = {
  smallMobile: {
    sectionVertical: 48,
    panelPadding: 12,
    cardsGap: 16,
  },
  mobile: {
    sectionVertical: 64,
    panelPadding: 16,
    cardsGap: 20,
  },
  largeMobile: {
    sectionVertical: 80,
    panelPadding: 20,
    cardsGap: 24,
  },
  tablet: {
    sectionVertical: 96,
    panelPadding: 24,
    cardsGap: 24,
  },
  desktop: {
    sectionVertical: 120,
    panelPadding: 32,
    cardsGap: 24,
  },
};

export const getDesignTier = (width) => {
  if (width <= DESIGN_BREAKPOINTS.SMALL_MOBILE_MAX) {
    return 'smallMobile';
  }
  if (width <= DESIGN_BREAKPOINTS.MOBILE_MAX) {
    return 'mobile';
  }
  if (width <= DESIGN_BREAKPOINTS.LARGE_MOBILE_MAX) {
    return 'largeMobile';
  }
  if (width <= DESIGN_BREAKPOINTS.TABLET_MAX) {
    return 'tablet';
  }
  return 'desktop';
};

export const getTypographyForWidth = (width) => TYPOGRAPHY_BY_TIER[getDesignTier(width)];

export const getSpacingForWidth = (width) => SPACING_BY_TIER[getDesignTier(width)];
