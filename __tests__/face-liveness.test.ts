import { evaluateLiveness, bufferDistance, parseImageDataUrl } from '@/lib/hris/face-liveness';

function jpegDataUrl(fill: number): string {
  const buf = Buffer.alloc(9000, fill);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

describe('face liveness heuristics', () => {
  it('rejects missing or tiny payloads', () => {
    const r = evaluateLiveness({ stillDataUrl: 'not-an-image', motionDataUrl: jpegDataUrl(1), motionScore: 0.2 });
    expect(r.ok).toBe(false);
  });

  it('rejects identical frames', () => {
    const same = jpegDataUrl(40);
    const r = evaluateLiveness({ stillDataUrl: same, motionDataUrl: same, motionScore: 0.2 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/identik/i);
  });

  it('accepts two related but different live frames with motion', () => {
    const still = jpegDataUrl(40);
    const motion = jpegDataUrl(48);
    const r = evaluateLiveness({ stillDataUrl: still, motionDataUrl: motion, motionScore: 0.12 });
    expect(r.ok).toBe(true);
    expect(r.frameDistance).toBeGreaterThan(0.008);
  });

  it('parses jpeg data URLs', () => {
    const parsed = parseImageDataUrl(jpegDataUrl(10));
    expect(parsed?.mime).toBe('image/jpeg');
    expect(parsed?.buffer.length).toBe(9000);
  });

  it('measures buffer distance', () => {
    const a = Buffer.alloc(100, 1);
    const b = Buffer.alloc(100, 200);
    expect(bufferDistance(a, a)).toBe(0);
    expect(bufferDistance(a, b)).toBeGreaterThan(0.5);
  });

  it('accepts video challenge frames (nod / left / right / front)', () => {
    const r = evaluateLiveness({
      stillDataUrl: jpegDataUrl(40),
      motionDataUrl: jpegDataUrl(48),
      motionScore: 0.12,
      challenges: {
        nod: jpegDataUrl(48),
        left: jpegDataUrl(56),
        right: jpegDataUrl(64),
        front: jpegDataUrl(40),
        scores: { nod: 0.12, left: 0.11, right: 0.13, front: 0.02 },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.mode).toBe('video');
  });

  it('rejects identical video challenge frames', () => {
    const same = jpegDataUrl(40);
    const r = evaluateLiveness({
      stillDataUrl: same,
      motionDataUrl: same,
      motionScore: 0.12,
      challenges: { nod: same, left: same, right: same, front: same, scores: { nod: 0.2, left: 0.2, right: 0.2 } },
    });
    expect(r.ok).toBe(false);
    expect(r.mode).toBe('video');
  });
});
