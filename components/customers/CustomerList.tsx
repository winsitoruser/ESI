import React, { useState } from 'react';
import { FaUser, FaBuilding, FaPhone, FaEnvelope, FaMapMarkerAlt, FaEdit, FaEye, FaSearch, FaFilter } from 'react-icons/fa';

export interface CustomerFilter {
  sortBy?: 'name' | 'registrationDate' | 'totalSpent';
  sortOrder?: 'asc' | 'desc';
  membershipLevel?: string;
  customerType?: 'individual' | 'corporate' | 'all';
  isActive?: boolean;
}

interface CustomerListProps {
  customers: any[];
  isLoading?: boolean;
  onSearch?: (query: string) => void;
  onFilter?: (filter: CustomerFilter) => void;
  onCustomerSelect?: (customer: any) => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ 
  customers = [], 
  isLoading = false,
  onSearch,
  onFilter,
  onCustomerSelect 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState<CustomerFilter>({
    sortBy: 'totalSpent',
    sortOrder: 'desc',
    customerType: 'all'
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleFilterChange = (newFilter: Partial<CustomerFilter>) => {
    const updatedFilter = { ...filter, ...newFilter };
    setFilter(updatedFilter);
    onFilter?.(updatedFilter);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getCustomerTypeBadge = (customerType: string) => {
    if (customerType === 'corporate') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <FaBuilding className="mr-1 h-3 w-3" />
          Corporate
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <FaUser className="mr-1 h-3 w-3" />
        Individual
      </span>
    );
  };

  const getMembershipBadge = (level: string) => {
    const colors: any = {
      'Bronze': 'bg-orange-100 text-orange-800',
      'Silver': 'bg-gray-100 text-gray-800',
      'Gold': 'bg-yellow-100 text-yellow-800',
      'Platinum': 'bg-purple-100 text-purple-800'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[level] || 'bg-gray-100 text-gray-800'}`}>
        {level}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Memuat data pelanggan...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Search and Filter Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Cari nama, telepon, email, atau perusahaan..."
                className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                aria-label="Cari pelanggan"
                />
            </div>
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-300 rounded-md flex items-center space-x-2 hover:bg-gray-50"
          >
            <FaFilter className="text-gray-600" />
            <span>Filter</span>
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Customer Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipe Pelanggan
              </label>
              <select
                value={filter.customerType}
                onChange={(e) => handleFilterChange({ customerType: e.target.value as any })}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">Semua Tipe</option>
                <option value="individual">Individual</option>
                <option value="corporate">Corporate</option>
              </select>
            </div>

            {/* Membership Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level Membership
              </label>
              <select
                value={filter.membershipLevel || ''}
                onChange={(e) => handleFilterChange({ membershipLevel: e.target.value || undefined })}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Semua Level</option>
                <option value="Bronze">Bronze</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Urutkan Berdasarkan
              </label>
              <select
                value={filter.sortBy}
                onChange={(e) => handleFilterChange({ sortBy: e.target.value as any })}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="totalSpent">Total Belanja</option>
                <option value="name">Nama</option>
                <option value="registrationDate">Tanggal Daftar</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Customer List */}
      <div className="overflow-x-auto">
        {customers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Tidak ada pelanggan ditemukan</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pelanggan
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipe
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kontak
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Membership
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Belanja
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-white font-semibold">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {customer.name}
                        </div>
                        {customer.customerType === 'corporate' && customer.companyName && (
                          <div className="text-sm text-gray-500 flex items-center">
                            <FaBuilding className="mr-1 h-3 w-3" />
                            {customer.companyName}
                          </div>
                        )}
                        {customer.customerType === 'corporate' && customer.picName && (
                          <div className="text-xs text-gray-400">
                            PIC: {customer.picName}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getCustomerTypeBadge(customer.customerType || 'individual')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center">
                      <FaPhone className="mr-2 text-gray-400" />
                      {customer.phoneNumber || customer.phone}
                    </div>
                    {customer.email && (
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <FaEnvelope className="mr-2 text-gray-400" />
                        {customer.email}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getMembershipBadge(customer.membershipLevel)}
                    <div className="text-xs text-gray-500 mt-1">
                      {customer.loyaltyPoints || customer.points || 0} poin
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(customer.totalSpent || 0)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {customer.totalPurchases || 0} transaksi
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => onCustomerSelect?.(customer)}
                      className="text-red-600 hover:text-red-900 mr-3"
                      aria-label={`Lihat detail pelanggan ${customer.name}`}
                    >
                      <FaEye className="inline mr-1" aria-hidden="true" />
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary Footer */}
      {customers.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="text-sm text-gray-700">
            Menampilkan <span className="font-medium">{customers.length}</span> pelanggan
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerList;
