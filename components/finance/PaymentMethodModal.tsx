import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FaCreditCard, FaUniversity, FaTags, FaMoneyBillWave, FaMobile, FaTruckMoving } from 'react-icons/fa';

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  paymentMethod?: any;
  mode: 'create' | 'edit';
}

const iconOptions = [
  { value: 'FaCreditCard', label: 'Credit Card', icon: <FaCreditCard /> },
  { value: 'FaUniversity', label: 'Bank', icon: <FaUniversity /> },
  { value: 'FaTags', label: 'Tags', icon: <FaTags /> },
  { value: 'FaMoneyBillWave', label: 'Cash', icon: <FaMoneyBillWave /> },
  { value: 'FaMobile', label: 'Mobile', icon: <FaMobile /> },
  { value: 'FaTruckMoving', label: 'Delivery', icon: <FaTruckMoving /> },
];

export default function PaymentMethodModal({ isOpen, onClose, onSave, paymentMethod, mode }: PaymentMethodModalProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    fees: 0,
    processing_time: '',
    icon: 'FaCreditCard',
    is_active: true,
    sort_order: 0
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (paymentMethod && mode === 'edit') {
      setFormData({
        code: paymentMethod.code || '',
        name: paymentMethod.name || '',
        description: paymentMethod.description || '',
        fees: paymentMethod.fees || 0,
        processing_time: paymentMethod.processing_time || '',
        icon: paymentMethod.icon || 'FaCreditCard',
        is_active: paymentMethod.is_active !== false,
        sort_order: paymentMethod.sort_order || 0
      });
    } else {
      setFormData({
        code: '',
        name: '',
        description: '',
        fees: 0,
        processing_time: '',
        icon: 'FaCreditCard',
        is_active: true,
        sort_order: 0
      });
    }
    setErrors({});
  }, [paymentMethod, mode, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Kode wajib diisi';
    } else if (!/^[A-Z_]+$/.test(formData.code)) {
      newErrors.code = 'Kode harus huruf kapital dan underscore';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Nama wajib diisi';
    }

    if (formData.fees < 0 || formData.fees > 100) {
      newErrors.fees = 'Biaya harus antara 0-100%';
    }

    if (!formData.processing_time.trim()) {
      newErrors.processing_time = 'Waktu proses wajib diisi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      const dataToSave = mode === 'edit' 
        ? { id: paymentMethod.id, ...formData }
        : formData;

      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error('Error saving payment method:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Tambah Metode Pembayaran' : 'Edit Metode Pembayaran'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Tambahkan metode pembayaran baru untuk transaksi'
              : 'Perbarui informasi metode pembayaran'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="BANK_TRANSFER"
                disabled={mode === 'edit'}
                className={errors.code ? 'border-red-500' : ''}
              />
              {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nama *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Transfer Bank"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Deskripsi metode pembayaran"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fees">Biaya (%) *</Label>
              <Input
                id="fees"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.fees}
                onChange={(e) => setFormData({ ...formData, fees: parseFloat(e.target.value) || 0 })}
                className={errors.fees ? 'border-red-500' : ''}
              />
              {errors.fees && <p className="text-xs text-red-500">{errors.fees}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="processing_time">Waktu Proses *</Label>
              <Input
                id="processing_time"
                value={formData.processing_time}
                onChange={(e) => setFormData({ ...formData, processing_time: e.target.value })}
                placeholder="Instan"
                className={errors.processing_time ? 'border-red-500' : ''}
              />
              {errors.processing_time && <p className="text-xs text-red-500">{errors.processing_time}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">Urutan</Label>
              <Input
                id="sort_order"
                type="number"
                min="0"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Aktif</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? 'Menyimpan...' : mode === 'create' ? 'Tambah' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
