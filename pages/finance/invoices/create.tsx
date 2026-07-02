import { NextPage } from "next";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import {
  FaFileInvoiceDollar,
  FaPlus,
  FaTrash,
  FaSave,
  FaArrowLeft,
  FaBuilding,
  FaCalendarAlt,
  FaDollarSign,
  FaShoppingCart,
} from "react-icons/fa";

interface InvoiceItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceFormData {
  supplierName: string;
  supplierAddress: string;
  supplierPhone: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  purchaseOrder: string;
  notes: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
}

const CreateInvoicePage: NextPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<InvoiceFormData>({
    supplierName: "",
    supplierAddress: "",
    supplierPhone: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: "",
    purchaseOrder: "",
    notes: "",
    items: [],
    subtotal: 0,
    taxRate: 11,
    taxAmount: 0,
    discount: 0,
    totalAmount: 0,
  });

  const [newItem, setNewItem] = useState({
    productName: "",
    quantity: 1,
    unitPrice: 0,
  });

  useEffect(() => {
    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    setFormData(prev => ({ ...prev, invoiceNumber }));
    
    // Set default due date (30 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    setFormData(prev => ({ ...prev, dueDate: dueDate.toISOString().split('T')[0] }));
    
    // Load suppliers (mock data for now)
    setSuppliers([
      { id: "1", name: "PT Kimia Farma", address: "Jakarta", phone: "021-1234567" },
      { id: "2", name: "PT Kalbe Farma", address: "Bekasi", phone: "021-7654321" },
      { id: "3", name: "PT Dexa Medica", address: "Palembang", phone: "0711-123456" },
    ]);
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [formData.items, formData.taxRate, formData.discount]);

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = (subtotal * formData.taxRate) / 100;
    const totalAmount = subtotal + taxAmount - formData.discount;
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      taxAmount,
      totalAmount,
    }));
  };

  const handleSupplierSelect = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      setFormData(prev => ({
        ...prev,
        supplierName: supplier.name,
        supplierAddress: supplier.address,
        supplierPhone: supplier.phone,
      }));
    }
  };

  const addItem = () => {
    if (!newItem.productName || newItem.quantity <= 0 || newItem.unitPrice <= 0) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field item dengan benar",
        variant: "destructive",
      });
      return;
    }

    const item: InvoiceItem = {
      id: Date.now().toString(),
      productName: newItem.productName,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice,
      total: newItem.quantity * newItem.unitPrice,
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item],
    }));

    setNewItem({
      productName: "",
      quantity: 1,
      unitPrice: 0,
    });
  };

  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId),
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplierName || formData.items.length === 0) {
      toast({
        title: "Error",
        description: "Mohon lengkapi supplier dan minimal satu item",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Transform data to match backend API structure
      const payload = {
        type: 'supplier',
        supplierName: formData.supplierName,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        items: formData.items.map(item => ({
          product: item.productName,
          quantity: item.quantity,
          price: item.unitPrice
        })),
        notes: formData.notes,
        purchaseOrderNumber: formData.purchaseOrder || null
      };

      const response = await fetch('/api/finance/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Berhasil",
          description: `Faktur ${data.data.id} berhasil dibuat`,
        });
        router.push('/finance/invoices');
      } else {
        throw new Error(data.error || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Create invoice error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal membuat faktur. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-sky-600 hover:text-sky-800 hover:bg-sky-50"
            >
              <FaArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <FaFileInvoiceDollar className="mr-3 text-sky-600" />
                Buat Faktur Baru
              </h1>
              <p className="text-gray-600 mt-1">
                Buat faktur supplier atau pelanggan baru
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Supplier Information */}
          <Card className="border-sky-100">
            <CardHeader className="bg-gradient-to-r from-sky-50 to-blue-50">
              <CardTitle className="text-sky-800 flex items-center">
                <FaBuilding className="mr-2" />
                Informasi Supplier
              </CardTitle>
              <CardDescription>
                Pilih supplier atau masukkan informasi supplier baru
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Pilih Supplier</Label>
                  <Select onValueChange={handleSupplierSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih supplier..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="supplierName">Nama Supplier *</Label>
                  <Input
                    id="supplierName"
                    value={formData.supplierName}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplierName: e.target.value }))}
                    placeholder="Masukkan nama supplier"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="supplierAddress">Alamat</Label>
                  <Input
                    id="supplierAddress"
                    value={formData.supplierAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplierAddress: e.target.value }))}
                    placeholder="Alamat supplier"
                  />
                </div>
                <div>
                  <Label htmlFor="supplierPhone">Telepon</Label>
                  <Input
                    id="supplierPhone"
                    value={formData.supplierPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplierPhone: e.target.value }))}
                    placeholder="Nomor telepon"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card className="border-sky-100">
            <CardHeader className="bg-gradient-to-r from-sky-50 to-blue-50">
              <CardTitle className="text-sky-800 flex items-center">
                <FaCalendarAlt className="mr-2" />
                Detail Faktur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="invoiceNumber">Nomor Faktur</Label>
                  <Input
                    id="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    placeholder="Nomor faktur"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="invoiceDate">Tanggal Faktur *</Label>
                  <Input
                    id="invoiceDate"
                    type="date"
                    value={formData.invoiceDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Jatuh Tempo *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseOrder">Purchase Order</Label>
                  <Input
                    id="purchaseOrder"
                    value={formData.purchaseOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchaseOrder: e.target.value }))}
                    placeholder="Nomor PO (opsional)"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Catatan tambahan..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card className="border-sky-100">
            <CardHeader className="bg-gradient-to-r from-sky-50 to-blue-50">
              <CardTitle className="text-sky-800 flex items-center">
                <FaShoppingCart className="mr-2" />
                Item Faktur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Add New Item */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="productName">Nama Produk/Layanan</Label>
                  <Input
                    id="productName"
                    value={newItem.productName}
                    onChange={(e) => setNewItem(prev => ({ ...prev, productName: e.target.value }))}
                    placeholder="Nama produk"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Jumlah</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="unitPrice">Harga Satuan</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    min="0"
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={addItem}
                    className="w-full bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600"
                  >
                    <FaPlus className="mr-2 h-4 w-4" />
                    Tambah
                  </Button>
                </div>
              </div>

              {/* Items Table */}
              {formData.items.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk/Layanan</TableHead>
                      <TableHead className="text-center">Jumlah</TableHead>
                      <TableHead className="text-right">Harga Satuan</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <FaTrash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card className="border-sky-100">
            <CardHeader className="bg-gradient-to-r from-sky-50 to-blue-50">
              <CardTitle className="text-sky-800 flex items-center">
                <FaDollarSign className="mr-2" />
                Total Faktur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="taxRate">Pajak (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.taxRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="discount">Diskon</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    value={formData.discount}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(formData.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pajak ({formData.taxRate}%):</span>
                  <span>{formatCurrency(formData.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Diskon:</span>
                  <span>-{formatCurrency(formData.discount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-sky-600">{formatCurrency(formData.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading || formData.items.length === 0}
              className="bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600"
            >
              <FaSave className="mr-2 h-4 w-4" />
              {loading ? "Menyimpan..." : "Simpan Faktur"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default CreateInvoicePage;
