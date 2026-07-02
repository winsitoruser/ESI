import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import CustomersLayout from '@/components/customers/CustomersLayout';
import { useTranslation } from '@/lib/i18n';
import { FaChartBar, FaChartPie, FaChartLine, FaDownload, FaCalendarAlt, FaInfoCircle } from 'react-icons/fa';
import {
  fetchCustomerOverviewReport,
  fetchTopCustomersReport,
  fetchCustomerSegmentationReport,
  fetchCustomerRetentionReport,
  fetchPurchaseBehaviorReport,
  generateCustomerReport
} from '@/lib/adapters/customer-reports-adapter';

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface DateRange {
  startDate: Date;
  endDate: Date;
}

const CustomerReportsPage: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<any>({
    newCustomersChart: { months: [], data: [] },
    purchaseFrequencyChart: { labels: [], data: [] },
    spendingDistributionChart: { labels: [], data: [] },
    membershipDistributionChart: { labels: [], data: [] }
  });
  const [isFromMock, setIsFromMock] = useState(true);
  const [period, setPeriod] = useState('month');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 5)),
    endDate: new Date()
  });
  const [overview, setOverview] = useState<any>(null);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [segmentation, setSegmentation] = useState<any>(null);
  const [retention, setRetention] = useState<any>(null);
  const [purchaseBehavior, setPurchaseBehavior] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all customer reports data
        const [overviewResult, topCustomersResult, segmentationResult, retentionResult, behaviorResult] = await Promise.all([
          fetchCustomerOverviewReport({ period }),
          fetchTopCustomersReport({ period, limit: 10 }),
          fetchCustomerSegmentationReport({ period }),
          fetchCustomerRetentionReport({ months: 6 }),
          fetchPurchaseBehaviorReport({ period })
        ]);

        // Set data from API
        if (overviewResult.success && overviewResult.data) {
          setOverview(overviewResult.data);
          setIsFromMock(overviewResult.isFromMock);
        }

        if (topCustomersResult.success && topCustomersResult.data) {
          setTopCustomers(topCustomersResult.data);
        }

        if (segmentationResult.success && segmentationResult.data) {
          setSegmentation(segmentationResult.data);
        }

        if (retentionResult.success && retentionResult.data) {
          setRetention(retentionResult.data);
          
          // Update chart data for new customers from retention data
          if (retentionResult.data.monthlyRetention) {
            const months = retentionResult.data.monthlyRetention.map((m: any) => m.monthLabel);
            const newCustomersData = retentionResult.data.monthlyRetention.map((m: any) => m.newCustomers);
            
            setChartData((prev: any) => ({
              ...prev,
              newCustomersChart: {
                months,
                data: newCustomersData
              }
            }));
          }
        }

        if (behaviorResult.success && behaviorResult.data) {
          setPurchaseBehavior(behaviorResult.data);
          
          // Update chart data for purchase frequency
          if (behaviorResult.data.purchaseFrequency) {
            const labels = behaviorResult.data.purchaseFrequency.map((f: any) => f.frequencyRange);
            const data = behaviorResult.data.purchaseFrequency.map((f: any) => f.customerCount);
            
            setChartData((prev: any) => ({
              ...prev,
              purchaseFrequencyChart: { labels, data }
            }));
          }
        }

        // Update spending distribution from segmentation
        if (segmentationResult.success && segmentationResult.data?.bySpending) {
          const labels = segmentationResult.data.bySpending.map((s: any) => s.segment);
          const data = segmentationResult.data.bySpending.map((s: any) => s.customerCount);
          
          setChartData((prev: any) => ({
            ...prev,
            spendingDistributionChart: { labels, data }
          }));
        }

        // Update membership distribution from segmentation
        if (segmentationResult.success && segmentationResult.data?.byType) {
          const labels = segmentationResult.data.byType.map((t: any) => t.customerType);
          const data = segmentationResult.data.byType.map((t: any) => t.customerCount);
          
          setChartData((prev: any) => ({
            ...prev,
            membershipDistributionChart: { labels, data }
          }));
        }

      } catch (error) {
        console.error('Error fetching customer reports:', error);
        setIsFromMock(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [period]);

  // New customers chart options
  const newCustomersOptions = {
    chart: {
      id: 'new-customers',
      type: 'area' as const,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false
        }
      },
    },
    colors: ['#ef4444'], // Red color from the theme
    xaxis: {
      categories: chartData?.newCustomersChart?.months || [],
    },
    yaxis: {
      title: {
        text: 'Jumlah Pelanggan Baru',
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: 'smooth' as const,
      width: 3,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.2,
        stops: [0, 90, 100],
        colorStops: [
          {
            offset: 0,
            color: '#ef4444', // Red
            opacity: 0.7
          },
          {
            offset: 100,
            color: '#f97316', // Orange
            opacity: 0.2
          }
        ]
      }
    },
    grid: {
      borderColor: '#f1f1f1',
    },
  };

  // Purchase frequency chart options
  const purchaseFrequencyOptions = {
    chart: {
      id: 'purchase-frequency',
      type: 'bar' as const,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false
        }
      },
    },
    colors: ['#f97316'], // Orange color from the theme
    plotOptions: {
      bar: {
        columnWidth: '70%',
        distributed: true,
      },
    },
    xaxis: {
      categories: chartData?.purchaseFrequencyChart?.labels || [],
      title: {
        text: 'Frekuensi Pembelian'
      }
    },
    yaxis: {
      title: {
        text: 'Jumlah Pelanggan',
      },
    },
    dataLabels: {
      enabled: false,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.3,
        gradientToColors: ['#ef4444'], // Red
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 0.8,
      },
    },
    legend: {
      show: false,
    },
  };

  // Membership pie chart options
  const membershipOptions = {
    chart: {
      id: 'membership-distribution',
      type: 'pie' as const,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false
        }
      },
    },
    colors: ['#f59e0b', '#ef4444', '#fbbf24', '#b91c1c'], // Amber, Red, Yellow, Dark Red
    labels: chartData?.membershipDistributionChart?.labels || [],
    legend: {
      position: 'bottom' as const,
      horizontalAlign: 'center' as const,
      fontSize: '14px',
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return val.toFixed(1) + '%';
      },
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return val + ' pelanggan';
        },
      },
    },
  };

  // Spending distribution options
  const spendingOptions = {
    chart: {
      id: 'spending-distribution',
      type: 'bar' as const,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false
        }
      },
    },
    colors: ['#ef4444'], // Red color from theme
    plotOptions: {
      bar: {
        columnWidth: '70%',
        distributed: true,
      },
    },
    xaxis: {
      categories: chartData?.spendingDistributionChart?.labels || [],
      title: {
        text: 'Total Belanja'
      }
    },
    yaxis: {
      title: {
        text: 'Jumlah Pelanggan',
      },
    },
    dataLabels: {
      enabled: false,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.3,
        gradientToColors: ['#f97316'], // Orange
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 0.8,
      },
    },
    legend: {
      show: false,
    },
  };

  // Function to handle date range change
  const handleDateRangeChange = (range: string) => {
    const endDate = new Date();
    let startDate = new Date();
    let newPeriod = 'month';
    
    switch (range) {
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        newPeriod = 'month';
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        newPeriod = 'month';
        break;
      case '6months':
        startDate.setMonth(startDate.getMonth() - 6);
        newPeriod = 'month';
        break;
      case '1year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        newPeriod = 'year';
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 6);
        newPeriod = 'month';
    }
    
    setDateRange({ startDate, endDate });
    setPeriod(newPeriod);
  };

  // Function to handle export report
  const handleExportReport = async (format: 'pdf' | 'excel') => {
    try {
      const result = await generateCustomerReport('overview', { period }, format);
      if (result.success && result.data) {
        alert(`Laporan berhasil dibuat!\nID: ${result.data.reportId}\nFormat: ${format.toUpperCase()}`);
      } else {
        alert('Gagal membuat laporan. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Terjadi kesalahan saat export laporan.');
    }
  };

  return (
    <CustomersLayout title="Laporan Pelanggan | FARMANESIA-EVO">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Laporan Pelanggan</h1>
            <p className="text-gray-500">Analisis performa dan perkembangan pelanggan</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => handleExportReport('pdf')}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-md flex items-center gap-2 hover:from-red-700 hover:to-orange-600"
              disabled={isLoading}
            >
              <FaDownload />
              <span>{isLoading ? 'Memuat...' : 'Ekspor PDF'}</span>
            </button>
            <button 
              onClick={() => handleExportReport('excel')}
              className="px-4 py-2 border border-red-200 bg-white text-red-600 rounded-md flex items-center gap-2 hover:bg-red-50"
              disabled={isLoading}
            >
              <FaDownload />
              <span>{isLoading ? 'Memuat...' : 'Ekspor Excel'}</span>
            </button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white border border-red-100 rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <FaCalendarAlt className="text-red-500 mr-2" />
              <span className="text-gray-700">Periode:</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => handleDateRangeChange('30days')}
                className={`px-3 py-1 rounded-md text-sm ${
                  dateRange.startDate.getTime() === new Date().setDate(new Date().getDate() - 30)
                    ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-700'
                }`}
              >
                30 Hari
              </button>
              <button 
                onClick={() => handleDateRangeChange('90days')}
                className={`px-3 py-1 rounded-md text-sm ${
                  dateRange.startDate.getTime() === new Date().setDate(new Date().getDate() - 90)
                    ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-700'
                }`}
              >
                90 Hari
              </button>
              <button 
                onClick={() => handleDateRangeChange('6months')}
                className={`px-3 py-1 rounded-md text-sm ${
                  dateRange.startDate.getMonth() === new Date().getMonth() - 6 ||
                  dateRange.startDate.getMonth() === new Date().getMonth() + 6
                    ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-700'
                }`}
              >
                6 Bulan
              </button>
              <button 
                onClick={() => handleDateRangeChange('1year')}
                className={`px-3 py-1 rounded-md text-sm ${
                  dateRange.startDate.getFullYear() === new Date().getFullYear() - 1
                    ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-700'
                }`}
              >
                1 Tahun
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {[1, 2, 3, 4].map((index) => (
              <div 
                key={`chart-skeleton-${index}`} 
                className="bg-white border border-red-100 rounded-lg shadow-sm p-4 animate-pulse"
              >
                <div className="h-6 w-48 bg-gray-200 mb-4"></div>
                <div className="w-full h-64 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* New Customers Chart */}
            <div className="bg-white border border-red-100 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <FaChartLine className="text-red-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-800">Pelanggan Baru per Bulan</h3>
                </div>
                {isFromMock && (
                  <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-500">
                    Data Simulasi
                  </span>
                )}
              </div>
              <div className="h-64">
                {typeof window !== 'undefined' && (
                  <Chart
                    options={newCustomersOptions}
                    series={[{ name: 'Pelanggan Baru', data: chartData?.newCustomersChart?.data || [] }]}
                    type="area" 
                    height="100%"
                  />
                )}
              </div>
            </div>

            {/* Purchase Frequency Chart */}
            <div className="bg-white border border-red-100 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <FaChartBar className="text-red-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-800">Frekuensi Pembelian</h3>
                </div>
                {isFromMock && (
                  <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-500">
                    Data Simulasi
                  </span>
                )}
              </div>
              <div className="h-64">
                {typeof window !== 'undefined' && (
                  <Chart
                    options={purchaseFrequencyOptions}
                    series={[{ name: 'Pelanggan', data: chartData?.purchaseFrequencyChart?.data || [] }]}
                    type="bar" 
                    height="100%"
                  />
                )}
              </div>
            </div>

            {/* Spending Distribution Chart */}
            <div className="bg-white border border-red-100 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <FaChartBar className="text-red-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-800">Distribusi Belanja</h3>
                </div>
                {isFromMock && (
                  <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-500">
                    Data Simulasi
                  </span>
                )}
              </div>
              <div className="h-64">
                {typeof window !== 'undefined' && (
                  <Chart
                    options={spendingOptions}
                    series={[{ name: 'Pelanggan', data: chartData?.spendingDistributionChart?.data || [] }]}
                    type="bar" 
                    height="100%"
                  />
                )}
              </div>
            </div>

            {/* Membership Distribution Chart */}
            <div className="bg-white border border-red-100 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <FaChartPie className="text-red-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-800">Distribusi Level Keanggotaan</h3>
                </div>
                {isFromMock && (
                  <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-500">
                    Data Simulasi
                  </span>
                )}
              </div>
              <div className="h-64">
                {typeof window !== 'undefined' && (
                  <Chart
                    options={membershipOptions}
                    series={chartData?.membershipDistributionChart?.data || []}
                    type="pie" 
                    height="100%"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Report Description */}
        <div className="bg-white border border-red-100 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Interpretasi Laporan</h3>
          
          <div className="space-y-4 text-gray-600">
            <p>
              Laporan ini memberikan gambaran komprehensif tentang basis pelanggan FARMANESIA-EVO. 
              Beberapa insight penting yang dapat diamati:
            </p>
            
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-gray-800">Pelanggan baru</strong> - Tren akuisisi pelanggan baru menunjukkan 
                pertumbuhan stabil dengan peningkatan 18% dalam 3 bulan terakhir.
              </li>
              <li>
                <strong className="text-gray-800">Frekuensi pembelian</strong> - Mayoritas pelanggan melakukan 
                2-3 transaksi, mengindikasikan peluang untuk program retensi yang lebih efektif.
              </li>
              <li>
                <strong className="text-gray-800">Distribusi belanja</strong> - 38% pelanggan membelanjakan 
                Rp1-3 juta, menunjukkan segmen menengah yang kuat.
              </li>
              <li>
                <strong className="text-gray-800">Keanggotaan</strong> - Distribusi level keanggotaan menunjukkan 
                40% pelanggan masih di level Bronze, memberikan peluang untuk upgrade.
              </li>
            </ul>
            
            <p>
              Rekomendasi: fokus pada strategi retensi untuk meningkatkan frekuensi kunjungan pelanggan, 
              dan implementasi program khusus untuk meningkatkan pelanggan Bronze ke level yang lebih tinggi.
            </p>
          </div>
        </div>
        
        {/* Data Source Note */}
        {isFromMock && (
          <div className="text-center">
            <div className="inline-block px-4 py-2 rounded-md bg-orange-50 border border-orange-100 text-orange-600 text-sm">
              Laporan ini menggunakan data simulasi. Penerapan API akan menampilkan data aktual.
            </div>
          </div>
        )}
      </div>
    </CustomersLayout>
  );
};

export default CustomerReportsPage;
