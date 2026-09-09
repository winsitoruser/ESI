import { geofenceClockAllowed, matchGeofences } from '@/lib/hris/geofence-utils';

const office = {
  id: 'gf-1',
  name: 'HQ Sudirman',
  center_lat: -6.2088,
  center_lng: 106.8456,
  radius_meters: 150,
};

describe('geofenceClockAllowed (WQ-040)', () => {
  it('allows clock when no fences are configured', () => {
    expect(geofenceClockAllowed(null, { fenceCount: 0 })).toEqual({ ok: true });
  });

  it('denies outside punch when fences exist and outside is not allowed', () => {
    const match = matchGeofences(-6.3, 106.9, [office]);
    expect(match?.inside).toBe(false);
    const d = geofenceClockAllowed(match, { fenceCount: 1, allowOutside: false });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.code).toBe('OUTSIDE_GEOFENCE');
  });

  it('allows inside punch', () => {
    const match = matchGeofences(-6.2088, 106.8456, [office]);
    expect(match?.inside).toBe(true);
    expect(geofenceClockAllowed(match, { fenceCount: 1 })).toEqual({ ok: true });
  });

  it('allows outside when policy says so', () => {
    const match = matchGeofences(-6.3, 106.9, [office]);
    expect(geofenceClockAllowed(match, { fenceCount: 1, allowOutside: true })).toEqual({ ok: true });
  });
});
