import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FaPrint, FaPlus, FaEdit, FaTrash, FaBarcode, FaCashRegister,
  FaDesktop, FaCheck, FaTimes, FaArrowLeft, FaSpinner, FaBluetooth,
  FaBluetoothB, FaSearch, FaLink, FaCog, FaSave, FaWrench
} from 'react-icons/fa';

const HardwareSettingsPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const MOCK_PRINTERS = [
    { id: 'pr1', name: 'Printer Kasir 1', type: 'thermal', connectionType: 'usb', ipAddress: '', port: '', isDefault: true, isActive: true },
    { id: 'pr2', name: 'Printer Dapur', type: 'thermal', connectionType: 'network', ipAddress: '192.168.1.100', port: '9100', isDefault: false, isActive: true },
  ];
  const [printers, setPrinters] = useState<any[]>(MOCK_PRINTERS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('printers');
  const [printerStatus, setPrinterStatus] = useState<{[key: string]: 'online' | 'offline' | 'testing'}>({});
  const [testingPrinter, setTestingPrinter] = useState<string | null>(null);
  
  // POS Printer Configuration State
  const [posPrinterSettings, setPosPrinterSettings] = useState({
    printerName: 'POS Printer',
    printerType: 'thermal',
    connectionType: 'usb',
    ipAddress: '',
    port: '',
    driverName: '',
    thermalModel: '',
    driverProfile: 'escpos',
    paperCutter: true
  });

  const [formData, setFormData] = useState({
    name: '',
    type: 'thermal',
    connectionType: 'network',
    ipAddress: '',
    port: '9100',
    bluetoothDeviceId: '',
    bluetoothDeviceName: '',
    isDefault: false,
    isActive: true
  });
  
  const [bluetoothDevices, setBluetoothDevices] = useState<any[]>([]);
  const [scanningBluetooth, setScanningBluetooth] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session) {
      fetchPrinters();
    }
  }, [session]);

  const fetchPrinters = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/hardware/printers');
      const data = await response.json();

      if (data.success) {
        setPrinters(data.data);
        // Check status for each printer
        data.data.forEach((printer: any) => {
          checkPrinterStatus(printer.id);
        });
      }
    } catch (error) {
      console.error('Error fetching printers:', error);
      setPrinters(MOCK_PRINTERS);
    } finally {
      setLoading(false);
    }
  };

  const checkPrinterStatus = async (printerId: string) => {
    try {
      const response = await fetch(`/api/settings/hardware/printers/${printerId}/status`);
      const data = await response.json();
      if (data.success) {
        setPrinterStatus(prev => ({
          ...prev,
          [printerId]: data.data.status
        }));
      }
    } catch (error) {
      setPrinterStatus(prev => ({
        ...prev,
        [printerId]: 'offline'
      }));
    }
  };

  
  const scanBluetoothDevices = async () => {
    setScanningBluetooth(true);
    setBluetoothDevices([]);
    
    try {
      // Check if Web Bluetooth API is available
      if (!(navigator as any).bluetooth) {
        alert('Web Bluetooth API tidak didukung di browser ini. Gunakan Chrome atau Edge.');
        return;
      }

      // Request Bluetooth device
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service'] // Add any required services
      });

      if (device) {
        setBluetoothDevices([{
          id: device.id,
          name: device.name || 'Unknown Device'
        }]);
        
        // Auto-select the first device found
        setFormData(prev => ({
          ...prev,
          bluetoothDeviceId: device.id,
          bluetoothDeviceName: device.name || 'Unknown Device',
          name: prev.name || `Bluetooth ${device.name || 'Printer'}`
        }));
      }
    } catch (error: any) {
      console.error('Error scanning Bluetooth:', error);
      if (error.name !== 'NotFoundError') {
        alert('Gagal memindai perangkat Bluetooth: ' + error.message);
      }
    } finally {
      setScanningBluetooth(false);
    }
  };

  const handleAdd = async () => {
    try {
      const response = await fetch('/api/settings/hardware/printers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        alert('Printer berhasil ditambahkan!');
        setShowAddModal(false);
        resetForm();
        fetchPrinters();
      } else {
        alert('Gagal menambahkan printer: ' + data.error);
      }
    } catch (error) {
      console.error('Error adding printer:', error);
      alert('Terjadi kesalahan saat menambahkan printer');
    }
  };

  const handleEdit = async () => {
    if (!selectedPrinter) return;

    try {
      const response = await fetch(`/api/settings/hardware/printers/${selectedPrinter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        alert('Printer berhasil diupdate!');
        setShowEditModal(false);
        resetForm();
        fetchPrinters();
      } else {
        alert('Gagal mengupdate printer: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating printer:', error);
      alert('Terjadi kesalahan saat mengupdate printer');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus printer ini?')) return;

    try {
      const response = await fetch(`/api/settings/hardware/printers/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('Printer berhasil dihapus!');
        fetchPrinters();
      } else {
        alert('Gagal menghapus printer: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting printer:', error);
      alert('Terjadi kesalahan saat menghapus printer');
    }
  };

  const handleTestPrint = async (id: string) => {
    try {
      // Find the printer to check connection type
      const printer = printers.find(p => p.id === id);
      
      if (printer?.connectionType === 'bluetooth') {
        // For Bluetooth, use the test-bluetooth endpoint
        const response = await fetch(`/api/settings/hardware/printers/${id}/test-bluetooth`, {
          method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
          // For Bluetooth, we need to handle printing on the client side
          if (confirm('Siap untuk mencetak test struk via Bluetooth? Pastikan printer sudah terhubung.')) {
            // Import the Bluetooth printer service dynamically
            const BluetoothPrinter = (await import('../../lib/bluetooth-printer')).default;
            const btPrinter = new BluetoothPrinter();
            
            try {
              await btPrinter.connect(data.printer.settings.bluetoothDeviceId);
              await btPrinter.printReceipt(data.testData);
              await btPrinter.disconnect();
              alert('Test print berhasil dikirim ke printer Bluetooth!');
            } catch (error: any) {
              alert('Gagal print via Bluetooth: ' + error.message);
            }
          }
        } else {
          alert('Gagal test print: ' + data.error);
        }
      } else {
        // For network/USB printers, use the regular test endpoint
        const response = await fetch(`/api/settings/hardware/printers/${id}/test`, {
          method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
          alert('Test print berhasil dikirim!');
        } else {
          alert('Gagal test print: ' + data.error);
        }
      }
    } catch (error) {
      console.error('Error test printing:', error);
      alert('Terjadi kesalahan saat test print');
    }
  };

  const openEditModal = (printer: any) => {
    setSelectedPrinter(printer);
    setFormData({
      name: printer.name,
      type: printer.type,
      connectionType: printer.connectionType,
      ipAddress: printer.ipAddress || '',
      port: printer.port?.toString() || '9100',
      bluetoothDeviceId: printer.settings?.bluetoothDeviceId || '',
      bluetoothDeviceName: printer.settings?.bluetoothDeviceName || '',
      isDefault: printer.isDefault,
      isActive: printer.isActive !== false
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'thermal',
      connectionType: 'network',
      ipAddress: '',
      port: '9100',
      bluetoothDeviceId: '',
      bluetoothDeviceName: '',
      isDefault: false,
      isActive: true
    });
    setSelectedPrinter(null);
    setBluetoothDevices([]);
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat Pengaturan Hardware...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Pengaturan Hardware | BEDAGANG Cloud POS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/settings')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Kembali ke Settings"
            >
              <FaArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Pengaturan Hardware</h1>
              <p className="text-indigo-100">
                Kelola printer, barcode scanner, dan perangkat lainnya
              </p>
            </div>
            <FaPrint className="w-16 h-16 text-white/30" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FaPrint className="text-2xl text-indigo-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Printer</p>
              <p className="text-2xl font-bold text-gray-900">{printers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FaCheck className="text-2xl text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Aktif</p>
              <p className="text-2xl font-bold text-green-600">
                {printers.filter(p => p.isActive !== false).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FaBarcode className="text-2xl text-indigo-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Barcode Scanner</p>
              <p className="text-sm font-semibold text-gray-900">Belum dikonfigurasi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FaCashRegister className="text-2xl text-indigo-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Cash Drawer</p>
              <p className="text-sm font-semibold text-gray-900">Belum dikonfigurasi</p>
            </CardContent>
          </Card>
        </div>

        {/* Printers Section */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Konfigurasi Printer & Hardware</CardTitle>
              <CardDescription>Kelola printer, scanner, dan perangkat hardware lainnya</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="printers">Daftar Printer</TabsTrigger>
                <TabsTrigger value="pos-config">Konfigurasi POS</TabsTrigger>
                <TabsTrigger value="other">Lainnya</TabsTrigger>
              </TabsList>

              {/* Tab 1: Daftar Printer */}
              <TabsContent value="printers" className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Printer Terdaftar</h3>
                  <Button
                    onClick={() => setShowAddModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <FaPlus className="mr-2" />
                    Tambah Printer
                  </Button>
                </div>
            {printers.length === 0 ? (
              <div className="text-center py-12">
                <FaPrint className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-2">Belum ada printer terkonfigurasi</p>
                <p className="text-sm text-gray-400">
                  Klik "Tambah Printer" untuk menambahkan printer pertama
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {printers.map((printer) => (
                  <div key={printer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <FaPrint className="text-indigo-600 text-xl" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{printer.name}</p>
                          {printer.isDefault && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                              Default
                            </span>
                          )}
                          {printer.isActive !== false ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                              Aktif
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                              Nonaktif
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span>{printer.type === 'thermal' ? 'Thermal' : 'Inkjet/Laser'}</span>
                          <span>•</span>
                          <span>
                            {printer.connectionType === 'network' ? 'Network' : 
                             printer.connectionType === 'bluetooth' ? 'Bluetooth' : 'USB'}
                          </span>
                          {printer.connectionType === 'network' && printer.ipAddress && (
                            <>
                              <span>•</span>
                              <span>{printer.ipAddress}:{printer.port}</span>
                            </>
                          )}
                          {printer.connectionType === 'bluetooth' && printer.settings?.bluetoothDeviceName && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <FaBluetoothB className="text-blue-600" />
                                {printer.settings.bluetoothDeviceName}
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            Status: 
                            {printerStatus[printer.id] === 'testing' ? (
                              <>
                                <FaSpinner className="animate-spin text-yellow-600" />
                                <span className="text-yellow-600">Testing</span>
                              </>
                            ) : printerStatus[printer.id] === 'online' ? (
                              <>
                                <FaCheck className="text-green-600" />
                                <span className="text-green-600">Online</span>
                              </>
                            ) : (
                              <>
                                <FaTimes className="text-red-600" />
                                <span className="text-red-600">Offline</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestPrint(printer.id)}
                        title="Test Print"
                      >
                        <FaPrint className="mr-1" /> Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(printer)}
                        title="Edit"
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(printer.id)}
                        title="Hapus"
                        className="text-red-600 hover:text-red-700"
                      >
                        <FaTrash />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
              </TabsContent>

              {/* Tab 2: Konfigurasi POS */}
              <TabsContent value="pos-config" className="mt-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Pengaturan Printer POS</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Konfigurasi Printer</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label htmlFor="posPrinterName">Nama Printer</Label>
                            <Input 
                              id="posPrinterName"
                              value={posPrinterSettings.printerName}
                              onChange={(e) => setPosPrinterSettings(prev => ({ ...prev, printerName: e.target.value }))}
                              placeholder="Masukkan nama printer"
                            />
                          </div>
                          
                          <div>
                            <Label>Jenis Printer</Label>
                            <Select 
                              value={posPrinterSettings.printerType} 
                              onValueChange={(value) => setPosPrinterSettings(prev => ({ ...prev, printerType: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="thermal">Thermal</SelectItem>
                                <SelectItem value="inkjet">Inkjet</SelectItem>
                                <SelectItem value="laser">Laser</SelectItem>
                                <SelectItem value="dotmatrix">Dot Matrix</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Tipe Koneksi</Label>
                            <Select 
                              value={posPrinterSettings.connectionType} 
                              onValueChange={(value) => setPosPrinterSettings(prev => ({ ...prev, connectionType: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="usb">USB</SelectItem>
                                <SelectItem value="bluetooth">Bluetooth</SelectItem>
                                <SelectItem value="network">Network</SelectItem>
                                <SelectItem value="serial">Serial</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {posPrinterSettings.connectionType === 'network' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label htmlFor="posIpAddress">IP Address</Label>
                                <Input 
                                  id="posIpAddress"
                                  value={posPrinterSettings.ipAddress}
                                  onChange={(e) => setPosPrinterSettings(prev => ({ ...prev, ipAddress: e.target.value }))}
                                  placeholder="192.168.1.100"
                                />
                              </div>
                              <div>
                                <Label htmlFor="posPort">Port</Label>
                                <Input 
                                  id="posPort"
                                  value={posPrinterSettings.port}
                                  onChange={(e) => setPosPrinterSettings(prev => ({ ...prev, port: e.target.value }))}
                                  placeholder="9100"
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="posPaperCutter"
                              checked={posPrinterSettings.paperCutter}
                              onCheckedChange={(checked) => setPosPrinterSettings(prev => ({ ...prev, paperCutter: !!checked }))}
                            />
                            <Label htmlFor="posPaperCutter">Gunakan paper cutter (pemotong kertas)</Label>
                          </div>

                          <div className="pt-4">
                            <Button onClick={() => alert('Pengaturan POS printer disimpan!')} className="w-full">
                              <FaSave className="mr-2" />
                              Simpan Pengaturan POS
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Driver & Pengaturan Lanjutan</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label>Driver Profile</Label>
                            <Select 
                              value={posPrinterSettings.driverProfile} 
                              onValueChange={(value) => setPosPrinterSettings(prev => ({ ...prev, driverProfile: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="escpos">ESC/POS</SelectItem>
                                <SelectItem value="star-line">Star Line Mode</SelectItem>
                                <SelectItem value="epson-default">Epson Default</SelectItem>
                                <SelectItem value="custom-driver">Custom Driver</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 mt-1">
                              {posPrinterSettings.driverProfile === 'escpos' && 'ESC/POS adalah standar perintah untuk sebagian besar printer struk.'}
                              {posPrinterSettings.driverProfile === 'star-line' && 'Mode baris Star Printer untuk kompatibilitas optimal.'}
                              {posPrinterSettings.driverProfile === 'epson-default' && 'Driver default Epson untuk printer TM Series.'}
                              {posPrinterSettings.driverProfile === 'custom-driver' && 'Gunakan driver kustom untuk printer non-standar.'}
                            </p>
                          </div>

                          <div>
                            <Label htmlFor="posDriverName">Nama Driver (Opsional)</Label>
                            <Input 
                              id="posDriverName"
                              value={posPrinterSettings.driverName}
                              onChange={(e) => setPosPrinterSettings(prev => ({ ...prev, driverName: e.target.value }))}
                              placeholder="Nama driver printer"
                            />
                          </div>

                          {posPrinterSettings.printerType === 'thermal' && (
                            <div>
                              <Label>Model Printer Thermal</Label>
                              <Select 
                                value={posPrinterSettings.thermalModel} 
                                onValueChange={(value) => setPosPrinterSettings(prev => ({ ...prev, thermalModel: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih model" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="epson-tmt82">Epson TM-T82</SelectItem>
                                  <SelectItem value="epson-tmt88">Epson TM-T88</SelectItem>
                                  <SelectItem value="epson-tmt20">Epson TM-T20</SelectItem>
                                  <SelectItem value="custom">Custom Model</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="pt-4 border-t">
                            <Button variant="outline" onClick={() => alert('Test print dikirim!')} className="w-full">
                              <FaPrint className="mr-2" />
                              Test Print
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 3: Other Hardware */}
              <TabsContent value="other" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <FaBarcode className="mr-2 text-indigo-600" />
                        Barcode Scanner
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Konfigurasi barcode scanner untuk scan produk
                      </p>
                      <Button variant="outline" className="w-full" disabled>
                        Konfigurasi Scanner
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <FaCashRegister className="mr-2 text-indigo-600" />
                        Cash Drawer
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Konfigurasi cash drawer otomatis
                      </p>
                      <Button variant="outline" className="w-full" disabled>
                        Konfigurasi Drawer
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <FaDesktop className="mr-2 text-indigo-600" />
                        Customer Display
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Konfigurasi display untuk customer
                      </p>
                      <Button variant="outline" className="w-full" disabled>
                        Konfigurasi Display
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Add Printer Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Tambah Printer</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Printer *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Printer Kasir 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipe Printer
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="thermal">Thermal (80mm)</option>
                    <option value="inkjet">Inkjet/Laser</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Koneksi
                  </label>
                  <select
                    value={formData.connectionType}
                    onChange={(e) => setFormData(prev => ({ ...prev, connectionType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="network">Network (IP)</option>
                    <option value="usb">USB</option>
                    <option value="bluetooth">Bluetooth</option>
                  </select>
                </div>

                {formData.connectionType === 'network' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        IP Address
                      </label>
                      <input
                        type="text"
                        value={formData.ipAddress}
                        onChange={(e) => setFormData(prev => ({ ...prev, ipAddress: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="192.168.1.100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Port
                      </label>
                      <input
                        type="text"
                        value={formData.port}
                        onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="9100"
                      />
                    </div>
                  </>
                )}

                {formData.connectionType === 'bluetooth' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Perangkat Bluetooth
                      </label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formData.bluetoothDeviceName}
                            onChange={(e) => setFormData(prev => ({ ...prev, bluetoothDeviceName: e.target.value }))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Pilih perangkat Bluetooth"
                            readOnly
                          />
                          <Button
                            type="button"
                            onClick={scanBluetoothDevices}
                            disabled={scanningBluetooth}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                          >
                            {scanningBluetooth ? (
                              <>
                                <FaSpinner className="animate-spin mr-2" />
                                Scanning...
                              </>
                            ) : (
                              <>
                                <FaBluetooth className="mr-2" />
                                Scan
                              </>
                            )}
                          </Button>
                        </div>
                        {bluetoothDevices.length > 0 && (
                          <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Perangkat ditemukan:</p>
                            {bluetoothDevices.map((device) => (
                              <div
                                key={device.id}
                                className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200"
                              >
                                <FaBluetoothB className="text-blue-600" />
                                <span className="text-sm">{device.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Set sebagai printer default
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Aktif
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleAdd}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  Tambah
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Printer Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Edit Printer</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Printer *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipe Printer
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="thermal">Thermal (80mm)</option>
                    <option value="inkjet">Inkjet/Laser</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Koneksi
                  </label>
                  <select
                    value={formData.connectionType}
                    onChange={(e) => setFormData(prev => ({ ...prev, connectionType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="network">Network (IP)</option>
                    <option value="usb">USB</option>
                    <option value="bluetooth">Bluetooth</option>
                  </select>
                </div>

                {formData.connectionType === 'network' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        IP Address
                      </label>
                      <input
                        type="text"
                        value={formData.ipAddress}
                        onChange={(e) => setFormData(prev => ({ ...prev, ipAddress: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Port
                      </label>
                      <input
                        type="text"
                        value={formData.port}
                        onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Set sebagai printer default
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Aktif
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleEdit}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  Simpan
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default HardwareSettingsPage;
