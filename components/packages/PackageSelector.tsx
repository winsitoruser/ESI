import { useState, useEffect } from 'react';
import { Package, Loader, AlertCircle, Filter, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PackageCard from './PackageCard';

interface PackageSelectorProps {
  businessTypeId?: string;
  industryType?: string;
  onPackageSelected: (packageId: string, packageData: any) => void;
}

export default function PackageSelector({
  businessTypeId,
  industryType = 'fnb',
  onPackageSelected
}: PackageSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    fetchPackages();
  }, [businessTypeId, industryType]);
  
  const fetchPackages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (businessTypeId) params.append('businessTypeId', businessTypeId);
      if (industryType) params.append('industryType', industryType);
      
      const response = await fetch(`/api/packages?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setPackages(data.data.packages);
        
        // Auto-select featured package if only one
        const featured = data.data.packages.filter((p: any) => p.isFeatured);
        if (featured.length === 1) {
          setSelectedPackageId(featured[0].id);
        }
      } else {
        toast.error('Gagal memuat paket bisnis');
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Gagal memuat paket bisnis');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectPackage = (packageId: string) => {
    setSelectedPackageId(packageId);
    const selectedPackage = packages.find(p => p.id === packageId);
    if (selectedPackage) {
      onPackageSelected(packageId, selectedPackage);
    }
  };
  
  const filteredPackages = packages.filter(pkg => {
    const matchesCategory = categoryFilter === 'all' || pkg.category === categoryFilter;
    const matchesSearch = searchQuery === '' || 
      pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  const categories = [
    { value: 'all', label: 'Semua Paket' },
    { value: 'starter', label: 'Starter' },
    { value: 'professional', label: 'Professional' },
    { value: 'enterprise', label: 'Enterprise' }
  ];
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Memuat paket bisnis...</p>
        </div>
      </div>
    );
  }
  
  if (packages.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Tidak ada paket tersedia</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pilih Paket Bisnis</h2>
        <p className="text-gray-600">
          Pilih paket yang sesuai dengan kebutuhan bisnis Anda. Semua modul akan otomatis diaktifkan.
        </p>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari paket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* Category Filter */}
        <div className="flex gap-2">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                categoryFilter === cat.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Package Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPackages.map(pkg => (
          <PackageCard
            key={pkg.id}
            {...pkg}
            onSelect={handleSelectPackage}
            isSelected={selectedPackageId === pkg.id}
          />
        ))}
      </div>
      
      {filteredPackages.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Tidak ada paket yang cocok dengan filter</p>
        </div>
      )}
      
      {/* Selected Package Info */}
      {selectedPackageId && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">Paket Terpilih:</p>
              <p className="text-lg font-bold text-blue-900">
                {packages.find(p => p.id === selectedPackageId)?.name}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
