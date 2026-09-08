import {
  normalizePlacement,
  sanitizeBannerHref,
  sanitizeBannerImageUrl,
} from '@/lib/saas/landing-banners';

describe('landing banners sanitizers', () => {
  it('allows relative CTA paths and Humanify https hosts', () => {
    expect(sanitizeBannerHref('/humanify/signup')).toBe('/humanify/signup');
    expect(sanitizeBannerHref('https://humanify.id/humanify/login')).toContain('humanify.id');
    expect(sanitizeBannerHref('javascript:alert(1)')).toBeNull();
    expect(sanitizeBannerHref('https://evil.example/phish')).toBeNull();
    expect(sanitizeBannerHref('//evil.example')).toBeNull();
  });

  it('allows only marketing or images paths', () => {
    expect(sanitizeBannerImageUrl('/uploads/marketing/banner-1.jpg')).toBe('/uploads/marketing/banner-1.jpg');
    expect(sanitizeBannerImageUrl('/images/humanify-hero-bg.png')).toBe('/images/humanify-hero-bg.png');
    expect(sanitizeBannerImageUrl('/uploads/letter-logos/x.png')).toBeNull();
    expect(sanitizeBannerImageUrl('/uploads/marketing/../secret')).toBeNull();
    expect(sanitizeBannerImageUrl('https://humanify.id/uploads/marketing/a.jpg')).toContain('/uploads/marketing/');
  });

  it('normalizes placement', () => {
    expect(normalizePlacement('landing')).toBe('landing');
    expect(normalizePlacement('DASHBOARD')).toBe('dashboard');
    expect(normalizePlacement('nope')).toBe('both');
  });
});
