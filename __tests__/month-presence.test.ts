import {
  buildMonthPresenceMix,
  classifyAttendanceStatus,
  classifyLeaveType,
  emptyMonthPresence,
  monthPresenceWindow,
} from '@/lib/hris/month-presence';

describe('month presence mix', () => {
  it('classifies attendance statuses into masuk / izin / cuti', () => {
    expect(classifyAttendanceStatus('present')).toBe('masuk');
    expect(classifyAttendanceStatus('LATE')).toBe('masuk');
    expect(classifyAttendanceStatus('work_from_home')).toBe('masuk');
    expect(classifyAttendanceStatus('izin')).toBe('izin');
    expect(classifyAttendanceStatus('permit')).toBe('izin');
    expect(classifyAttendanceStatus('on_leave')).toBe('cuti');
    expect(classifyAttendanceStatus('sick')).toBe('cuti');
    expect(classifyAttendanceStatus('absent')).toBeNull();
  });

  it('treats personal/izin leave as izin and the rest as cuti', () => {
    expect(classifyLeaveType('personal')).toBe('izin');
    expect(classifyLeaveType('unpaid')).toBe('izin');
    expect(classifyLeaveType('annual')).toBe('cuti');
    expect(classifyLeaveType('sick')).toBe('cuti');
    expect(classifyLeaveType('maternity')).toBe('cuti');
  });

  it('builds percentages from people and days', () => {
    const mix = buildMonthPresenceMix([
      { bucket: 'masuk', people: 20, days: 140 },
      { bucket: 'izin', people: 5, days: 8 },
      { bucket: 'cuti', people: 5, days: 12 },
    ], new Date('2026-09-09T00:00:00Z'));

    expect(mix.period).toBe('2026-09');
    expect(mix.periodLabel.toLowerCase()).toContain('september');
    expect(mix.monthStart).toBe('2026-09-01');
    expect(mix.monthEnd).toBe('2026-09-09');
    expect(mix.totalPeople).toBe(30);
    expect(mix.uniqueEmployees).toBe(30);
    expect(mix.totalDays).toBe(160);
    const masuk = mix.buckets.find((b) => b.key === 'masuk')!;
    expect(masuk.peoplePct).toBe(66.7);
    expect(masuk.daysPct).toBe(87.5);
    const izin = mix.buckets.find((b) => b.key === 'izin')!;
    expect(izin.people).toBe(5);
    expect(izin.peoplePct).toBe(16.7);
  });

  it('returns zeroed buckets when empty', () => {
    const mix = emptyMonthPresence(new Date('2026-09-09T00:00:00Z'));
    expect(mix.buckets).toHaveLength(3);
    expect(mix.totalPeople).toBe(0);
    expect(mix.uniqueEmployees).toBe(0);
    expect(mix.buckets.every((b) => b.people === 0 && b.daysPct === 0)).toBe(true);
  });

  it('uses ISO month-to-date window', () => {
    const w = monthPresenceWindow(new Date('2026-09-09T12:00:00Z'));
    expect(w.monthStart).toBe('2026-09-01');
    expect(w.monthEnd).toBe('2026-09-09');
  });
});
