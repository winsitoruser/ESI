import { careersChecklistHref } from '@/lib/saas/go-live';

describe('careersChecklistHref', () => {
  it('sends incomplete missions to recruitment create, not the public portal', () => {
    expect(careersChecklistHref('pt-ekosistem-satwa-indonesia', false)).toBe(
      '/humanify/recruitment?create=1',
    );
    expect(careersChecklistHref(null, false)).toBe('/humanify/recruitment?create=1');
  });

  it('previews the public portal once an open job exists', () => {
    expect(careersChecklistHref('pt-ekosistem-satwa-indonesia', true)).toBe(
      '/c/pt-ekosistem-satwa-indonesia/careers',
    );
  });
});
