import { matchEnrollmentToLive } from '@/lib/hris/face-match';

jest.mock('@/lib/hris/sumopod-config', () => ({
  sumopodVision: jest.fn(),
}));

const { sumopodVision } = require('@/lib/hris/sumopod-config') as {
  sumopodVision: jest.Mock;
};

const ENROLL = 'data:image/jpeg;base64,' + Buffer.alloc(9000, 10).toString('base64');
const LIVE = 'data:image/jpeg;base64,' + Buffer.alloc(9000, 20).toString('base64');

describe('matchEnrollmentToLive', () => {
  beforeEach(() => {
    sumopodVision.mockReset();
  });

  it('returns matched true when vision says same person', async () => {
    sumopodVision.mockResolvedValue('{"samePerson":true,"confidence":0.91,"hasFace":true,"looksLive":true}');
    const r = await matchEnrollmentToLive(ENROLL, LIVE, { requireVision: true });
    expect(r.matched).toBe(true);
    expect(r.source).toBe('vision');
    expect(r.confidence).toBeGreaterThan(0.8);
  });

  it('returns matched false when different person', async () => {
    sumopodVision.mockResolvedValue('{"samePerson":false,"confidence":0.2,"hasFace":true,"looksLive":true}');
    const r = await matchEnrollmentToLive(ENROLL, LIVE, { requireVision: true });
    expect(r.matched).toBe(false);
    expect(r.reason).toMatch(/tidak cocok/i);
  });

  it('fails closed for selfie clock when vision unavailable', async () => {
    sumopodVision.mockResolvedValue(null);
    const r = await matchEnrollmentToLive(ENROLL, LIVE, { requireVision: true });
    expect(r.matched).toBe(false);
    expect(r.reason).toMatch(/tidak tersedia/i);
  });

  it('allows liveness_only fallback when requireVision is false', async () => {
    sumopodVision.mockResolvedValue(null);
    const r = await matchEnrollmentToLive(ENROLL, LIVE, { requireVision: false });
    expect(r.matched).toBe(true);
    expect(r.source).toBe('liveness_only');
  });

  it('accepts same person with moderate confidence', async () => {
    sumopodVision.mockResolvedValue('{"samePerson":true,"confidence":0.4,"hasFace":true,"looksLive":true}');
    const r = await matchEnrollmentToLive(ENROLL, LIVE, { requireVision: true });
    expect(r.matched).toBe(true);
  });

  it('parses string booleans and percent confidence', async () => {
    sumopodVision.mockResolvedValue('{"samePerson":"true","confidence":"78","hasFace":"true"}');
    const r = await matchEnrollmentToLive(ENROLL, LIVE, { requireVision: true });
    expect(r.matched).toBe(true);
    expect(r.confidence).toBeGreaterThan(0.5);
  });
});
