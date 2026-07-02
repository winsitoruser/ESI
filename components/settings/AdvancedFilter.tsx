import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FaSearch, FaFilter, FaTimes, FaDownload, FaCalendarAlt } from 'react-icons/fa';

interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'checkbox';
  options?: { value: string; label: string }[];
}

interface AdvancedFilterProps {
  filters: FilterOption[];
  onFilterChange: (filters: { [key: string]: any }) => void;
  onExport?: (filteredData: any[]) => void;
  data?: any[];
}

const AdvancedFilter: React.FC<AdvancedFilterProps> = ({ 
  filters, 
  onFilterChange, 
  onExport,
  data = [] 
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{ [key: string]: any }>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    onFilterChange({ ...activeFilters, search: searchTerm });
  }, [activeFilters, searchTerm]);

  const handleFilterChange = (key: string, value: any) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      if (value === '' || value === null || value === undefined) {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setSearchTerm('');
  };

  const getFilteredData = () => {
    return data.filter(item => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const searchableFields = Object.values(item).join(' ').toLowerCase();
        if (!searchableFields.includes(searchLower)) {
          return false;
        }
      }
      
      // Other filters
      for (const [key, value] of Object.entries(activeFilters)) {
        if (item[key] !== value) {
          return false;
        }
      }
      
      return true;
    });
  };

  const handleExport = () => {
    if (onExport) {
      onExport(getFilteredData());
    }
  };

  const activeFilterCount = Object.keys(activeFilters).length + (searchTerm ? 1 : 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <FaFilter className="mr-2" />
            Filter & Pencarian
            {activeFilterCount > 0 && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
                {activeFilterCount} aktif
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {data.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <FaDownload className="mr-1" />
                Export
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <FaSearch className="mr-1" />
              {showAdvanced ? 'Sembunyikan' : 'Tampilkan'} Filter
            </Button>
          </div>
        </div>
        
        {/* Quick Search */}
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      
      {showAdvanced && (
        <CardContent className="border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {filter.label}
                </label>
                
                {filter.type === 'text' && (
                  <Input
                    placeholder={`Filter ${filter.label}`}
                    value={activeFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  />
                )}
                
                {filter.type === 'select' && (
                  <Select
                    value={activeFilters[filter.key] || ''}
                    onValueChange={(value) => handleFilterChange(filter.key, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Pilih ${filter.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {filter.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                {filter.type === 'date' && (
                  <Input
                    type="date"
                    value={activeFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  />
                )}
                
                {filter.type === 'checkbox' && (
                  <div className="space-y-2">
                    {filter.options?.map((option) => (
                      <label key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          checked={activeFilters[filter.key]?.includes(option.value) || false}
                          onCheckedChange={(checked) => {
                            const currentValues = activeFilters[filter.key] || [];
                            if (checked) {
                              handleFilterChange(filter.key, [...currentValues, option.value]);
                            } else {
                              handleFilterChange(
                                filter.key,
                                currentValues.filter((v: string) => v !== option.value)
                              );
                            }
                          }}
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {activeFilterCount > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {Object.entries(activeFilters).map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                  >
                    {filters.find(f => f.key === key)?.label || key}: {String(value)}
                    <button
                      onClick={() => handleFilterChange(key, '')}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      <FaTimes />
                    </button>
                  </span>
                ))}
                {searchTerm && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                    Pencarian: {searchTerm}
                    <button
                      onClick={() => setSearchTerm('')}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      <FaTimes />
                    </button>
                  </span>
                )}
              </div>
              
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                <FaTimes className="mr-1" />
                Hapus Semua
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default AdvancedFilter;
