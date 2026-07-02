import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Customer, CustomerSummary } from '@/types/customer';
import CustomersLayout from '@/components/customers/CustomersLayout';
import { useTranslation } from '@/lib/i18n';
import CustomerList, { CustomerFilter } from '@/components/customers/CustomerList';
import CustomerStatisticsCard from '@/components/customers/cards/CustomerStatisticsCard';
import { mockCustomers, mockCustomerSummary } from '@/data/mockCustomers';

const CustomerListPage: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers as any);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>(mockCustomers as any);
  const [statistics, setStatistics] = useState<CustomerSummary | null>(mockCustomerSummary as any);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<CustomerFilter>({
    sortBy: 'totalSpent',
    sortOrder: 'desc'
  });

  useEffect(() => {
    // Fetch customers and statistics
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch customer data from new API
        const response = await fetch('/api/customers/list');
        if (!response.ok) {
          throw new Error('Failed to fetch customers');
        }
        const data = await response.json();
        
        if (data.success) {
          setCustomers(data.data.customers || []);
          
          // Set statistics from API response
          if (data.data.statistics) {
            const stats = data.data.statistics;
            setStatistics({
              totalCustomers: parseInt(stats.totalCustomers) || 0,
              totalIndividual: parseInt(stats.totalIndividual) || 0,
              totalCorporate: parseInt(stats.totalCorporate) || 0,
              totalRevenue: parseFloat(stats.totalRevenue) || 0,
              averageSpending: parseFloat(stats.averageSpent) || 0,
              activeCustomers: parseInt(stats.totalCustomers) || 0,
              newCustomersThisMonth: 0,
              topSpenders: []
            });
          }
        } else {
          console.error('API returned error:', data.error);
          setCustomers([]);
        }
      } catch (error) {
        console.error('Error fetching customer data:', error);
        setCustomers(mockCustomers as any);
        setStatistics(mockCustomerSummary as any);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    // Apply filtering and sorting
    if (!customers.length) return;
    
    let result = [...customers];
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(customer => 
        customer.name.toLowerCase().includes(query) ||
        customer.phoneNumber.includes(query) ||
        (customer.email && customer.email.toLowerCase().includes(query))
      );
    }
    
    // Apply membership filter
    if (filter.membershipLevel) {
      result = result.filter(customer => 
        customer.membershipLevel === filter.membershipLevel
      );
    }
    
    // Apply active status filter
    if (filter.isActive !== undefined) {
      result = result.filter(customer => 
        customer.isActive === filter.isActive
      );
    }
    
    // Apply sorting
    if (filter.sortBy) {
      result.sort((a, b) => {
        let comparison = 0;
        
        switch (filter.sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'registrationDate':
            comparison = new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime();
            break;
          case 'totalSpent':
          default:
            comparison = a.totalSpent - b.totalSpent;
            break;
        }
        
        return filter.sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    
    setFilteredCustomers(result);
  }, [customers, searchQuery, filter]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilter = (newFilter: CustomerFilter) => {
    setFilter(newFilter);
  };

  return (
    <CustomersLayout title="Daftar Pelanggan | FARMANESIA-EVO">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Daftar Pelanggan</h1>
          <button 
            onClick={() => router.push('/customers/new')}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-md flex items-center space-x-2"
          >
            <span>Pelanggan Baru</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {statistics && <CustomerStatisticsCard statistics={statistics} isLoading={isLoading} />}
        
        <div className="mt-8">
          <CustomerList 
            customers={filteredCustomers} 
            isLoading={isLoading}
            onSearch={handleSearch}
            onFilter={handleFilter}
          />
        </div>
      </div>
    </CustomersLayout>
  );
};

export default CustomerListPage;
