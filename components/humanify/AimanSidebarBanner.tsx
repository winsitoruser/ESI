import Link from 'next/link';

const BANNER = '/images/aiman-sidebar-banner.jpg';
const HREF = '/humanify/ai?tab=copilot';

export default function AimanSidebarBanner({ collapsed }: { collapsed: boolean }) {
  return (
    <>
      <div className={`shrink-0 border-t border-[var(--hf-border-subtle)] p-3 ${collapsed ? 'lg:hidden' : ''}`}>
        <Link
          href={HREF}
          aria-label="Ask AIMAN — AI Assistant Humanify"
          className="group relative block overflow-hidden rounded-[var(--hf-radius-lg)] ring-1 ring-[var(--hf-brand-100)] shadow-[var(--hf-shadow)] transition hover:ring-[var(--hf-brand-500)] hover:shadow-[var(--hf-shadow-md)]"
        >
          <img
            src={BANNER}
            alt="AIMAN — AI Assistant Humanify. Siap membantu HR, payroll, dan employee service. Ask AIMAN."
            width={1024}
            height={576}
            className="block h-auto w-full object-cover object-center transition duration-300 group-hover:scale-[1.02]"
          />
        </Link>
      </div>
      <div className={`hidden shrink-0 border-t border-[var(--hf-border-subtle)] p-2 ${collapsed ? 'lg:block' : ''}`}>
        <Link
          href={HREF}
          aria-label="Tanya AIMAN"
          title="Tanya AIMAN"
          className="relative mx-auto block h-12 w-12 overflow-hidden rounded-[var(--hf-radius)] ring-1 ring-[var(--hf-brand-100)] transition hover:ring-[var(--hf-brand-500)]"
        >
          <img
            src={BANNER}
            alt=""
            className="absolute inset-0 h-full w-full scale-150 object-cover object-[82%_42%]"
          />
        </Link>
      </div>
    </>
  );
}
