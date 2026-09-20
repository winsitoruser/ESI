import PayrollInputPage from '@/components/humanify/PayrollInputPage';

export default function CashAdvancePage() {
  return (
    <PayrollInputPage
      type="cash_advance"
      title="Kasbon / Cash Advance"
      subtitle="Uang muka karyawan — potong otomatis di Proses Gaji, cicilan opsional"
      icon="wallet"
      categories={['operational', 'emergency', 'travel', 'other']}
      showInstallment
      categoryLabels={{
        operational: 'Operasional',
        emergency: 'Darurat',
        travel: 'Perjalanan',
        other: 'Lainnya',
      }}
    />
  );
}
