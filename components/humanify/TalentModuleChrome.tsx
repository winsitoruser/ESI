import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  LayoutDashboard, UserPlus, BookOpen, ClipboardList, Award, BarChart3, GraduationCap, PenTool, Library, Database,
} from 'lucide-react';
import { OpsPageHero, OpsStage, type OpsChip } from '@/components/humanify/OpsPageChrome';

export const TALENT_NAV = [
  { id: 'recruitment', href: '/humanify/recruitment', label: 'Rekrutmen', icon: UserPlus },
  { id: 'talent-bank', href: '/humanify/talent-bank', label: 'Bank Data', icon: Database },
  { id: 'lms', href: '/humanify/lms', label: 'Dasbor LMS', icon: LayoutDashboard },
  { id: 'courses', href: '/humanify/lms/courses', label: 'Kursus', icon: BookOpen },
  { id: 'tests', href: '/humanify/lms/tests', label: 'Tes', icon: ClipboardList },
  { id: 'bank', href: '/humanify/lms/question-bank', label: 'Bank Soal', icon: Library },
  { id: 'grading', href: '/humanify/lms/grading', label: 'Penilaian', icon: PenTool },
  { id: 'competency', href: '/humanify/lms/competency', label: 'Kompetensi', icon: Award },
  { id: 'analytics', href: '/humanify/lms/analytics', label: 'Analitik', icon: BarChart3 },
  { id: 'training', href: '/humanify/training', label: 'Pelatihan', icon: GraduationCap },
  { id: 'certificates', href: '/humanify/certificates', label: 'Sertifikat', icon: Award },
] as const;

export type TalentNavId = (typeof TALENT_NAV)[number]['id'];

export function TalentModuleNav({ current }: { current: TalentNavId }) {
  return (
    <nav
      aria-label="Modul Talent & Belajar"
      className="flex min-w-0 overflow-x-auto hf-card p-1.5"
    >
      {TALENT_NAV.map((item) => {
        const Icon = item.icon as LucideIcon;
        const active = item.id === current;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`flex shrink-0 items-center gap-1.5 rounded-[var(--hf-radius)] px-3 py-2 text-xs font-medium transition-colors md:text-sm ${
              active
                ? 'bg-[var(--hf-brand-600)] text-white'
                : 'text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)] hover:text-[color:var(--hf-ink)]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function TalentShell({
  current,
  title,
  subtitle,
  icon,
  actions,
  chips,
  score,
  scoreLabel,
  children,
}: {
  current: TalentNavId;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  chips?: OpsChip[];
  score?: number | null;
  scoreLabel?: string;
  children: ReactNode;
}) {
  return (
    <OpsStage>
      <OpsPageHero
        title={title}
        subtitle={subtitle}
        badge="Talent & Belajar"
        liveLabel="L&D ops"
        icon={icon}
        actions={actions}
        chips={chips}
        score={score}
        scoreLabel={scoreLabel}
      />
      <TalentModuleNav current={current} />
      {children}
    </OpsStage>
  );
}
