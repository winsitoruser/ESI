import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Users, Plus, Building2, ArrowRight } from 'lucide-react';
import { Badge, Card, SectionHeader, PrimaryBtn, EmptyState, TableWrap } from '@/components/sfa/shared-ui';

interface Team {
  id: string;
  name: string;
  code: string;
  team_type: string;
  is_active: boolean;
  member_count?: number;
  leader_name?: string;
}

interface Territory {
  id: string;
  code: string;
  name: string;
  region?: string;
  city?: string;
  province?: string;
}

interface HrisSyncStatus {
  activeHrisEmployees?: number;
  syncedToSfa?: number;
  unsyncedCount?: number;
  sfaTeams?: number;
  sfaMembers?: number;
}

interface HrisDepartment {
  department: string;
  active_count: number;
}

interface HrisUser {
  id: string;
  name: string;
  email: string;
  hris_department?: string;
  hris_position?: string;
  role: string;
  current_team?: string;
}

interface TerritoriesTabProps {
  teams: Team[];
  territories: Territory[];
  hrisSyncStatus: HrisSyncStatus | null;
  hrisDepartments: HrisDepartment[];
  hrisAvailableUsers: HrisUser[];
  hrisSyncing: boolean;
  isManager: boolean;
  onCreateTeam: () => void;
  onAddMember: (teamId: string, teamName: string) => void;
  onSyncFromHris: (dept: HrisDepartment) => void;
  t: (key: string) => string;
}

export default function TerritoriesTab({ teams, territories, hrisSyncStatus, hrisDepartments, hrisAvailableUsers, hrisSyncing, isManager, onCreateTeam, onAddMember, onSyncFromHris, t }: TerritoriesTabProps) {
  return (
    <>
      <SectionHeader title={t('sfa.teamFieldForce')} subtitle={`${teams.length} ${t('sfa.statTeams').toLowerCase()} | ${territories.length} territory`}
        action={<div className="flex gap-2"><PrimaryBtn onClick={onCreateTeam} icon={Plus}>{t('sfa.createTeam')}</PrimaryBtn></div>} />

      {/* HRIS Sync Status Banner */}
      {hrisSyncStatus && (
        <Card className="mb-4 !bg-gradient-to-r from-violet-50 to-blue-50 border-violet-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center"><Building2 className="w-5 h-5 text-violet-600" /></div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{t('sfa.hrisIntegration')}</h3>
                <p className="text-xs text-gray-500">{hrisSyncStatus.activeHrisEmployees} karyawan aktif | {hrisSyncStatus.syncedToSfa} sudah di SFA | {hrisSyncStatus.unsyncedCount} belum assign</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><div className="text-lg font-bold text-violet-600">{hrisSyncStatus.sfaTeams}</div><div className="text-[10px] text-gray-400">Tim</div></div>
                <div><div className="text-lg font-bold text-blue-600">{hrisSyncStatus.sfaMembers}</div><div className="text-[10px] text-gray-400">Member</div></div>
                <div><div className="text-lg font-bold text-amber-600">{hrisSyncStatus.unsyncedCount}</div><div className="text-[10px] text-gray-400">Belum Sync</div></div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* HRIS Department Quick-Sync */}
      {isManager && hrisDepartments.length > 0 && (
        <Card className="mb-4">
          <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2"><Building2 className="w-4 h-4 text-violet-500" /> {t('sfa.syncFromHris')}</h4>
          <p className="text-xs text-gray-500 mb-3">{t('sfa.syncFromHrisDesc')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {hrisDepartments.map((d: HrisDepartment) => (
              <button key={d.department} disabled={hrisSyncing}
                onClick={() => onSyncFromHris(d)}
                className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-all text-left disabled:opacity-50"
              >
                <div>
                  <div className="text-xs font-medium text-gray-900">{d.department}</div>
                  <div className="text-[10px] text-gray-400">{d.active_count} karyawan aktif</div>
                </div>
                <ArrowRight className="w-3 h-3 text-gray-400" />
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Teams Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.length === 0 ? <div className="col-span-3"><EmptyState icon={Users} title={t('sfa.noTeams')} /></div> :
          teams.map((team: Team) => (
            <Card key={team.id} className="p-5" hover>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">{(team.name || '?')[0]}</div>
                  <div><h3 className="font-semibold text-gray-900 text-sm">{team.name}</h3><p className="text-[11px] text-gray-400 mt-0.5">{team.code} | {team.team_type}</p></div>
                </div>
                <Badge color={team.is_active ? 'green' : 'gray'}>{team.is_active ? 'Active' : 'Off'}</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 pt-3 border-t border-gray-50">
                <div className="flex items-center gap-1"><Users className="w-3 h-3" /> {team.member_count || 0} anggota</div>
                {team.leader_name && <div className="text-gray-400">| Leader: <span className="text-gray-600 font-medium">{team.leader_name}</span></div>}
              </div>
              {isManager && (
                <button onClick={() => onAddMember(team.id, team.name)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-gray-200 rounded-lg text-xs text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all">
                  <Plus className="w-3 h-3" /> {t('sfa.addMember')}
                </button>
              )}
            </Card>
          ))
        }
      </div>

      {/* Available Users from HRIS */}
      {isManager && hrisAvailableUsers.length > 0 && (
        <>
          <SectionHeader title={t('sfa.availableEmployees')} subtitle={`${hrisAvailableUsers.filter((u: HrisUser) => !u.current_team).length} ${t('sfa.notAssignedYet')}`} />
          <TableWrap>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Nama</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 hidden sm:table-cell">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 hidden md:table-cell">Posisi</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Tim SFA</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {hrisAvailableUsers.slice(0, 15).map((u: HrisUser) => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3"><div className="font-medium text-gray-900">{u.name}</div><div className="text-[10px] text-gray-400">{u.email}</div></td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell text-xs">{u.hris_department || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell text-xs">{u.hris_position || u.role}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${u.role === 'manager' || u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span></td>
                    <td className="px-4 py-3">{u.current_team ? <span className="text-xs text-green-600 font-medium">{u.current_team}</span> : <span className="text-xs text-gray-400">{t('sfa.notAssignedYet')}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </>
      )}

      {territories.length > 0 && (<>
        <SectionHeader title="Territory" subtitle={`${territories.length} wilayah`} />
        <TableWrap>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100"><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kode</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Region</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Kota</th><th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Provinsi</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {territories.map((t: Territory) => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs text-amber-600 font-medium">{t.code}</td>
                  <td className="px-5 py-3.5 font-semibold text-gray-900">{t.name}</td>
                  <td className="px-5 py-3.5 text-gray-600 hidden sm:table-cell">{t.region || '-'}</td>
                  <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell">{t.city || '-'}</td>
                  <td className="px-5 py-3.5 text-gray-600 hidden lg:table-cell">{t.province || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </>)}
    </>
  );
}
