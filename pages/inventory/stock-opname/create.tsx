import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { 
  FaClipboardList, FaArrowLeft, FaPlus, FaSave, FaWarehouse,
  FaMapMarkerAlt, FaCalendar, FaUser, FaTimes
} from 'react-icons/fa';

interface SelectedLocation {
  warehouse_id: number;
  warehouse_name: string;
  location_id: number;
  location_name: string;
  location_code: string;
}

const CreateStockOpnamePage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedLocations, setSelectedLocations] = useState<SelectedLocation[]>([]);
  
  const [formData, setFormData] = useState({
    opname_number: `SO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-6)}`,
    opname_type: 'full',
    scheduled_date: new Date().toISOString().split('T')[0],
    performed_by: session?.user?.name || '',
    supervised_by: '',
    notes: ''
  });

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      loadLocations(selectedWarehouse);
    }
  }, [selectedWarehouse]);

  const loadWarehouses = async () => {
    try {
      const response = await fetch('/api/warehouses');
      const result = await response.json();
      if (result.success) {
        setWarehouses(result.data);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const loadLocations = async (warehouseId: string) => {
    try {
      const response = await fetch(`/api/locations?warehouse_id=${warehouseId}`);
      const result = await response.json();
      if (result.success) {
        setLocations(result.data);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const handleAddLocation = () => {
    if (!selectedWarehouse) {
      alert(t('inventory.stockOpname.selectWarehouseFirst'));
      return;
    }

    const locationSelect = document.getElementById('location-select') as HTMLSelectElement;
    const locationId = locationSelect?.value;
    
    if (!locationId) {
      alert(t('inventory.stockOpname.selectLocationFirst'));
      return;
    }

    const warehouse = warehouses.find(w => w.id.toString() === selectedWarehouse);
    const location = locations.find(l => l.id.toString() === locationId);

    if (!warehouse || !location) return;

    // Check if already added
    if (selectedLocations.some(sl => sl.location_id === location.id)) {
      alert(t('inventory.stockOpname.locationAlreadyAdded'));
      return;
    }

    setSelectedLocations([...selectedLocations, {
      warehouse_id: warehouse.id,
      warehouse_name: warehouse.name,
      location_id: location.id,
      location_name: location.name,
      location_code: location.code
    }]);

    // Reset location select
    locationSelect.value = '';
  };

  const handleRemoveLocation = (locationId: number) => {
    setSelectedLocations(selectedLocations.filter(sl => sl.location_id !== locationId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedLocations.length === 0) {
      alert(t('inventory.stockOpname.addMinLocation'));
      return;
    }

    setLoading(true);
    try {
      // Create stock opname with selected locations
      const payload = {
        ...formData,
        warehouse_id: selectedLocations[0].warehouse_id,
        locations: selectedLocations.map(sl => ({
          location_id: sl.location_id,
          location_code: sl.location_code
        }))
      };

      const response = await fetch('/api/stock-opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${t('inventory.stockOpname.createSuccess')}\n\n${t('inventory.stockOpname.number')}: ${result.data.opname_number}`);
        router.push(`/inventory/stock-opname/${result.data.id}`);
      } else {
        alert(t('inventory.stockOpname.createFailed') + ': ' + result.message);
      }
    } catch (error) {
      console.error('Error creating stock opname:', error);
      alert(t('inventory.stockOpname.createError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Head>
        <title>{t('inventory.stockOpname.createPageTitle')}</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 mb-6 text-white">
          <div className="flex items-center space-x-4">
            <Link href="/inventory/stock-opname">
              <Button variant="outline" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                <FaArrowLeft className="mr-2" />
                {t('common.back')}
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center">
                <FaClipboardList className="mr-3" />
                {t('inventory.stockOpname.createNew')}
              </h1>
              <p className="text-indigo-100">
                {t('inventory.stockOpname.createSubtitle')}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Form Stock Opname */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('inventory.stockOpname.info')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaClipboardList className="inline mr-2" />
                    {t('inventory.stockOpname.number')}
                  </label>
                  <Input
                    type="text"
                    value={formData.opname_number}
                    onChange={(e) => setFormData({...formData, opname_number: e.target.value})}
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaCalendar className="inline mr-2" />
                    {t('inventory.stockOpname.scheduledDate')}
                  </label>
                  <Input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('inventory.stockOpname.opnameType')}
                  </label>
                  <select
                    value={formData.opname_type}
                    onChange={(e) => setFormData({...formData, opname_type: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="full">{t('inventory.stockOpname.fullCount')}</option>
                    <option value="cycle">{t('inventory.stockOpname.cycleCount')}</option>
                    <option value="spot">{t('inventory.stockOpname.spotCheck')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaUser className="inline mr-2" />
                    {t('inventory.stockOpname.performedBy')}
                  </label>
                  <Input
                    type="text"
                    value={formData.performed_by}
                    onChange={(e) => setFormData({...formData, performed_by: e.target.value})}
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaUser className="inline mr-2" />
                    {t('inventory.stockOpname.supervisedBy')}
                  </label>
                  <Input
                    type="text"
                    value={formData.supervised_by}
                    onChange={(e) => setFormData({...formData, supervised_by: e.target.value})}
                    placeholder={t('inventory.stockOpname.supervisorPlaceholder')}
                    className="w-full"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('inventory.stockOpname.notesLabel')}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    placeholder={t('inventory.stockOpname.notesPlaceholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lokasi Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('inventory.stockOpname.selectLocations')}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {t('inventory.stockOpname.selectLocationsDesc')}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaWarehouse className="inline mr-2" />
                    {t('inventory.stockOpname.warehouse')}
                  </label>
                  <select
                    value={selectedWarehouse}
                    onChange={(e) => {
                      setSelectedWarehouse(e.target.value);
                      setLocations([]);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">{t('inventory.stockOpname.selectWarehouse')}</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaMapMarkerAlt className="inline mr-2" />
                    {t('inventory.stockOpname.locationRack')}
                  </label>
                  <select
                    id="location-select"
                    disabled={!selectedWarehouse}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                  >
                    <option value="">{t('inventory.stockOpname.selectLocation')}</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.code} - {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={handleAddLocation}
                    disabled={!selectedWarehouse}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    <FaPlus className="mr-2" />
                    {t('inventory.stockOpname.addLocation')}
                  </Button>
                </div>
              </div>

              {/* Selected Locations */}
              {selectedLocations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    {t('inventory.stockOpname.selectedLocations')} ({selectedLocations.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedLocations.map((sl) => (
                      <div
                        key={sl.location_id}
                        className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg p-3"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">
                            {sl.warehouse_name} - {sl.location_code}
                          </p>
                          <p className="text-sm text-gray-600">{sl.location_name}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveLocation(sl.location_id)}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <FaTimes />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLocations.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <FaMapMarkerAlt className="mx-auto text-4xl text-gray-400 mb-2" />
                  <p className="text-gray-600">
                    {t('inventory.stockOpname.noLocationsSelected')}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('inventory.stockOpname.noLocationsHint')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Link href="/inventory/stock-opname">
              <Button type="button" variant="outline">
                {t('common.cancel')}
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={loading || selectedLocations.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <FaSave className="mr-2" />
              {loading ? t('common.saving') : t('inventory.stockOpname.createNew')}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default CreateStockOpnamePage;
