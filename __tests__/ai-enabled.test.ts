import { isHumanifyAiEnabled, isHumanifyAiUiEnabled } from '@/lib/hris/ai-enabled';

describe('Humanify AIMAN kill-switch', () => {
  const prevServer = process.env.HUMANIFY_AI_ENABLED;
  const prevPub = process.env.NEXT_PUBLIC_HUMANIFY_AI_ENABLED;

  afterEach(() => {
    if (prevServer === undefined) delete process.env.HUMANIFY_AI_ENABLED;
    else process.env.HUMANIFY_AI_ENABLED = prevServer;
    if (prevPub === undefined) delete process.env.NEXT_PUBLIC_HUMANIFY_AI_ENABLED;
    else process.env.NEXT_PUBLIC_HUMANIFY_AI_ENABLED = prevPub;
  });

  it('enables APIs by default', () => {
    delete process.env.HUMANIFY_AI_ENABLED;
    delete process.env.NEXT_PUBLIC_HUMANIFY_AI_ENABLED;
    expect(isHumanifyAiEnabled()).toBe(true);
    expect(isHumanifyAiUiEnabled()).toBe(true);
  });

  it('does not 503 APIs when only the public UI flag is off', () => {
    delete process.env.HUMANIFY_AI_ENABLED;
    process.env.NEXT_PUBLIC_HUMANIFY_AI_ENABLED = 'false';
    expect(isHumanifyAiEnabled()).toBe(true);
    expect(isHumanifyAiUiEnabled()).toBe(false);
  });

  it('disables APIs and UI when HUMANIFY_AI_ENABLED is false', () => {
    process.env.HUMANIFY_AI_ENABLED = 'false';
    delete process.env.NEXT_PUBLIC_HUMANIFY_AI_ENABLED;
    expect(isHumanifyAiEnabled()).toBe(false);
    expect(isHumanifyAiUiEnabled()).toBe(false);
  });
});
