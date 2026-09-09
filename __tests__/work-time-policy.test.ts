import {
  evaluateClockIn,
  evaluateClockOut,
  normalizeWorkTimePolicy,
  presetForSystem,
  minutesAfter,
  parseHm,
  businessDateInTimeZone,
  clockHmInTimeZone,
} from '@/lib/hris/work-time-policy';

/** Thursday 3 Sep 2026 at HH:MM in Asia/Jakarta. */
function at(hm: string, day = '2026-09-03'): Date {
  return new Date(`${day}T${hm}:00+07:00`);
}

describe('work-time policy defaults', () => {
  it('defaults unknown systems to fixed office hours', () => {
    const p = normalizeWorkTimePolicy({ workTimeSystem: 'nope' as any });
    expect(p.workTimeSystem).toBe('fixed');
    expect(p.workStartTime).toBe('08:00');
    expect(p.workDays).toEqual([1, 2, 3, 4, 5]);
    expect(p.lateGraceMinutes).toBe(15);
  });

  it('applies flextime preset windows', () => {
    const p = normalizeWorkTimePolicy(presetForSystem('flexible'));
    expect(p.flexWindowStart).toBe('07:00');
    expect(p.flexWindowEnd).toBe('10:00');
    expect(p.coreHoursStart).toBe('10:00');
  });
});

describe('evaluateClockIn', () => {
  it('marks late after grace on fixed hours', () => {
    const r = evaluateClockIn({ workTimeSystem: 'fixed', workStartTime: '08:00', lateGraceMinutes: 15 }, at('08:20'));
    expect(r.status).toBe('late');
    expect(r.lateMinutes).toBe(20);
    expect(r.expectedStart).toBe('08:00');
  });

  it('stays present inside grace', () => {
    const r = evaluateClockIn({ workTimeSystem: 'fixed', workStartTime: '08:00', lateGraceMinutes: 15 }, at('08:10'));
    expect(r.status).toBe('present');
    expect(r.lateMinutes).toBe(0);
  });

  it('uses flextime window end as the punctuality cutoff', () => {
    const r = evaluateClockIn({
      workTimeSystem: 'flexible',
      flexWindowEnd: '10:00',
      lateGraceMinutes: 15,
    }, at('10:20'));
    expect(r.status).toBe('late');
    expect(r.expectedStart).toBe('10:00');
    expect(r.lateMinutes).toBe(20);
  });

  it('does not mark late on hours-bank or field systems', () => {
    expect(evaluateClockIn({ workTimeSystem: 'hours_bank' }, at('14:00')).tracksPunctuality).toBe(false);
    expect(evaluateClockIn({ workTimeSystem: 'field' }, at('14:00')).status).toBe('present');
    expect(evaluateClockIn({ workTimeSystem: 'hours_bank' }, at('14:00')).lateMinutes).toBe(0);
  });

  it('uses assigned shift start when provided', () => {
    const r = evaluateClockIn(
      { workTimeSystem: 'shift', workStartTime: '08:00', lateGraceMinutes: 10 },
      at('07:25'),
      { shiftStart: '07:00' },
    );
    expect(r.expectedStart).toBe('07:00');
    expect(r.status).toBe('late');
    expect(r.lateMinutes).toBe(25);
  });
});

describe('evaluateClockOut', () => {
  it('subtracts break and detects overtime past end + minimum', () => {
    const r = evaluateClockOut(
      {
        workTimeSystem: 'fixed',
        workEndTime: '17:00',
        breakDurationMinutes: 60,
        overtimeEnabled: true,
        overtimeMinMinutes: 30,
        earlyLeaveGraceMinutes: 15,
      },
      at('08:00'),
      at('18:00'),
    );
    expect(r.workHours).toBe(9);
    expect(r.overtimeMinutes).toBe(60);
    expect(r.earlyLeaveMinutes).toBe(0);
  });

  it('records early leave beyond grace', () => {
    const r = evaluateClockOut(
      { workTimeSystem: 'fixed', workEndTime: '17:00', earlyLeaveGraceMinutes: 15, overtimeEnabled: false, breakDurationMinutes: 60 },
      at('08:00'),
      at('16:30'),
    );
    expect(r.earlyLeaveMinutes).toBe(30);
    expect(r.overtimeMinutes).toBe(0);
  });

  it('counts hours-bank overtime from daily target, not clock-out time', () => {
    const r = evaluateClockOut(
      { workTimeSystem: 'hours_bank', dailyHoursTarget: 8, overtimeEnabled: true, overtimeMinMinutes: 30, breakDurationMinutes: 0 },
      at('08:00'),
      at('17:00'),
    );
    expect(r.tracksPunctuality).toBe(false);
    expect(r.workHours).toBe(9);
    expect(r.overtimeMinutes).toBe(60);
  });
});

describe('minutesAfter night wrap', () => {
  it('treats 07:00 as 60 minutes after 06:00 even across midnight', () => {
    expect(minutesAfter(parseHm('06:00'), parseHm('07:00'), true)).toBe(60);
    expect(minutesAfter(parseHm('22:00'), parseHm('00:30'), true)).toBe(150);
  });
});

describe('businessDateInTimeZone (WQ-038)', () => {
  it('uses Asia/Jakarta date, not UTC, around midnight WIB', () => {
    const justAfterMidnightWib = new Date('2026-09-09T17:30:00.000Z'); // 00:30 WIB 10 Sep
    expect(justAfterMidnightWib.toISOString().split('T')[0]).toBe('2026-09-09');
    expect(businessDateInTimeZone(justAfterMidnightWib)).toBe('2026-09-10');
    const beforeMidnightWib = new Date('2026-09-09T16:59:00.000Z'); // 23:59 WIB 9 Sep
    expect(businessDateInTimeZone(beforeMidnightWib)).toBe('2026-09-09');
    expect(clockHmInTimeZone(beforeMidnightWib)).toBe('23:59');
  });
});
