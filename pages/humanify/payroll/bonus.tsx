import PayrollInputPage from '@/components/humanify/PayrollInputPage';

export default function BonusPage() {
  return (
    <PayrollInputPage
      type="bonus"
      title="Bonus & Insentif"
      subtitle="Bonus kinerja, proyek, dan insentif — feed ke payroll"
      icon="gift"
      categories={['performance', 'project', 'attendance', 'holiday', 'other']}
    />
  );
}
