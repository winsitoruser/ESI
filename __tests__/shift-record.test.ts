import { normalizeWorkShift, workShiftWriteAttrs } from '@/lib/hris/shift-record';

describe('normalizeWorkShift', () => {
  it('maps Sequelize camelCase so UI does not show OFF', () => {
    const v = normalizeWorkShift({
      id: 'abc',
      code: 'PAGI',
      name: 'Shift Pagi',
      shiftType: 'regular',
      startTime: '08:00:00',
      endTime: '17:00:00',
      isActive: true,
      isCrossDay: false,
      workHoursPerDay: 8,
      applicableDays: [1, 2, 3, 4, 5],
    });
    expect(v.is_active).toBe(true);
    expect(v.start_time).toBe('08:00');
    expect(v.end_time).toBe('17:00');
    expect(v.shift_type).toBe('regular');
  });

  it('keeps snake_case rows', () => {
    const v = normalizeWorkShift({
      id: '1',
      code: 'M',
      name: 'Malam',
      shift_type: 'regular',
      start_time: '22:00',
      end_time: '06:00',
      is_active: true,
      is_cross_day: true,
    });
    expect(v.is_active).toBe(true);
    expect(v.is_cross_day).toBe(true);
  });

  it('treats missing isActive as on (new shift default)', () => {
    expect(normalizeWorkShift({ id: 'x', name: 'X', code: 'X' }).is_active).toBe(true);
  });
});

describe('workShiftWriteAttrs', () => {
  it('drops snake_case duplicates and forces isActive true unless explicitly off', () => {
    const a = workShiftWriteAttrs({
      code: 'PAGI',
      name: 'Pagi',
      start_time: '07:00',
      end_time: '15:00',
      is_active: true,
      shift_type: 'regular',
    }, 'tenant-1');
    expect(a.tenantId).toBe('tenant-1');
    expect(a.startTime).toBe('07:00');
    expect(a.endTime).toBe('15:00');
    expect(a.isActive).toBe(true);
    expect(a.shiftType).toBe('regular');
    expect((a as any).start_time).toBeUndefined();
  });
});
