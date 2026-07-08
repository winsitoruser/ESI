import PayrollInputPage from '@/components/humanify/PayrollInputPage';

export default function LoanPage() {
  return (
    <PayrollInputPage
      type="loan"
      title="Pinjaman Karyawan"
      subtitle="Pinjaman dengan cicilan otomatis — potong gaji bulanan"
      icon="credit"
      categories={['emergency', 'education', 'housing', 'vehicle', 'other']}
      showInstallment
    />
  );
}
