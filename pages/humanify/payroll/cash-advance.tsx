import PayrollInputPage from '@/components/humanify/PayrollInputPage';

export default function CashAdvancePage() {
  return (
    <PayrollInputPage
      type="cash_advance"
      title="Kasbon / Cash Advance"
      subtitle="Uang muka karyawan — potong gaji otomatis periode berikutnya"
      icon="wallet"
      categories={['operational', 'emergency', 'travel', 'other']}
    />
  );
}
