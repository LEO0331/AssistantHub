/* eslint-disable no-undef */
import {
  DESIGN_BREAKPOINTS,
  getDesignTier,
  getSpacingForWidth,
  getTypographyForWidth,
} from './designSystem';

describe('designSystem breakpoint contract', () => {
  test('maps boundaries to expected tiers', () => {
    expect(getDesignTier(478)).toBe('smallMobile');
    expect(getDesignTier(479)).toBe('mobile');
    expect(getDesignTier(640)).toBe('mobile');
    expect(getDesignTier(641)).toBe('largeMobile');
    expect(getDesignTier(767)).toBe('largeMobile');
    expect(getDesignTier(768)).toBe('tablet');
    expect(getDesignTier(991)).toBe('tablet');
    expect(getDesignTier(992)).toBe('desktop');

    expect(DESIGN_BREAKPOINTS.SMALL_MOBILE_MAX).toBe(478);
    expect(DESIGN_BREAKPOINTS.MOBILE_MAX).toBe(640);
    expect(DESIGN_BREAKPOINTS.LARGE_MOBILE_MAX).toBe(767);
    expect(DESIGN_BREAKPOINTS.TABLET_MAX).toBe(991);
  });

  test('returns exact typography scale values per tier', () => {
    expect(getTypographyForWidth(1200)).toEqual({
      hero: 64,
      subtitle: 20,
      cardTitle: 25.6,
      sectionTitle: 52,
      body: 16,
    });
    expect(getTypographyForWidth(800)).toEqual({
      hero: 52,
      subtitle: 17,
      cardTitle: 23,
      sectionTitle: 52,
      body: 16,
    });
    expect(getTypographyForWidth(700)).toEqual({
      hero: 36,
      subtitle: 16,
      cardTitle: 20.8,
      sectionTitle: 36.8,
      body: 16,
    });
    expect(getTypographyForWidth(540)).toEqual({
      hero: 32,
      subtitle: 15,
      cardTitle: 20,
      sectionTitle: 32,
      body: 15,
    });
    expect(getTypographyForWidth(420)).toEqual({
      hero: 25.6,
      subtitle: 14,
      cardTitle: 17,
      sectionTitle: 25.6,
      body: 15,
    });
  });

  test('returns exact spacing scale values per tier', () => {
    expect(getSpacingForWidth(1200)).toEqual({
      sectionVertical: 120,
      panelPadding: 32,
      cardsGap: 24,
    });
    expect(getSpacingForWidth(800)).toEqual({
      sectionVertical: 96,
      panelPadding: 24,
      cardsGap: 24,
    });
    expect(getSpacingForWidth(700)).toEqual({
      sectionVertical: 80,
      panelPadding: 20,
      cardsGap: 24,
    });
    expect(getSpacingForWidth(540)).toEqual({
      sectionVertical: 64,
      panelPadding: 16,
      cardsGap: 20,
    });
    expect(getSpacingForWidth(420)).toEqual({
      sectionVertical: 48,
      panelPadding: 12,
      cardsGap: 16,
    });
  });
});
