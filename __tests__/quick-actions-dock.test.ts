import {
  HUMANIFY_QUICK_ACTIONS,
  isTypingTarget,
  matchQuickActionShortcut,
} from '@/lib/humanify/quick-actions';

describe('Humanify quick-action shortcuts', () => {
  it('maps F1–F4 and F6–F9, skipping F5', () => {
    const keys = HUMANIFY_QUICK_ACTIONS.map((a) => a.shortcut);
    expect(keys).toEqual(['F1', 'F2', 'F3', 'F4', 'F6', 'F7', 'F8', 'F9']);
    expect(keys).not.toContain('F5');
    expect(HUMANIFY_QUICK_ACTIONS[0].href).toContain('/humanify/employees');
  });

  it('matches function keys and Alt+digit aliases', () => {
    const f1 = matchQuickActionShortcut(new KeyboardEvent('keydown', { key: 'F1' }));
    expect(f1?.id).toBe('add-employee');

    const alt3 = matchQuickActionShortcut(
      new KeyboardEvent('keydown', { key: '3', code: 'Digit3', altKey: true }),
    );
    expect(alt3?.id).toBe('payroll');

    const f1code = matchQuickActionShortcut(new KeyboardEvent('keydown', { key: 'F1', code: 'F1' }));
    expect(f1code?.id).toBe('add-employee');

    const f5 = matchQuickActionShortcut(new KeyboardEvent('keydown', { key: 'F5' }));
    expect(f5).toBeNull();
  });

  it('ignores shortcuts while typing and with Ctrl/Meta', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    expect(isTypingTarget(input)).toBe(true);

    const typing = matchQuickActionShortcut(
      new KeyboardEvent('keydown', { key: 'F1', bubbles: true }),
    );
    // Event target is window/null in this constructor — still matches F1.
    expect(typing?.id).toBe('add-employee');

    const withTarget = new KeyboardEvent('keydown', { key: 'F1', bubbles: true });
    Object.defineProperty(withTarget, 'target', { value: input });
    expect(matchQuickActionShortcut(withTarget)).toBeNull();

    const cmd = matchQuickActionShortcut(new KeyboardEvent('keydown', { key: 'F1', metaKey: true }));
    expect(cmd).toBeNull();
    input.remove();
  });
});
