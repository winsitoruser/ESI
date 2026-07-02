import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FaCog, FaShoppingCart, FaUserShield, FaHome, FaBolt, FaTags, FaCar, FaTools, FaFileInvoiceDollar, FaBox, FaStethoscope, FaCoins } from 'react-icons/fa';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  category?: any;
  mode: 'create' | 'edit';
  defaultType?: 'income' | 'expense';
}

const iconOptions = [
  { value: 'FaCog', label: 'Cog', icon: <FaCog /> },
  { value: 'FaShoppingCart', label: 'Shopping Cart', icon: <FaShoppingCart /> },
  { value: 'FaUserShield', label: 'User Shield', icon: <FaUserShield /> },
  { value: 'FaHome', label: 'Home', icon: <FaHome /> },
  { value: 'FaBolt', label: 'Bolt', icon: <FaBolt /> },
  { value: 'FaTags', label: 'Tags', icon: <FaTags /> },
  { value: 'FaCar', label: 'Car', icon: <FaCar /> },
  { value: 'FaTools', label: 'Tools', icon: <FaTools /> },
  { value: 'FaFileInvoiceDollar', label: 'Invoice', icon: <FaFileInvoiceDollar /> },
  { value: 'FaBox', label: 'Box', icon: <FaBox /> },
  { value: 'FaStethoscope', label: 'Stethoscope', icon: <FaStethoscope /> },
  { value: 'FaCoins', label: 'Coins', icon: <FaCoins /> },
];

const colorOptions = [
  { value: 'blue', label: 'Biru' },
  { value: 'green', label: 'Hijau' },
  { value: 'purple', label: 'Ungu' },
  { value: 'orange', label: 'Oranye' },
  { value: 'yellow', label: 'Kuning' },
  { value: 'pink', label: 'Pink' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'red', label: 'Merah' },
  { value: 'gray', label: 'Abu-abu' },
  { value: 'cyan', label: 'Cyan' },
];

export default function CategoryModal({ isOpen, onClose, onSave, category, mode, defaultType = 'expense' }: CategoryModalProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: defaultType,
    description: '',
    icon: 'FaTags',
    color: 'blue',
    is_active: true,
    sort_order: 0
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (category && mode === 'edit') {
      setFormData({
        code: category.code || '',
        name: category.name || '',
        type: category.type || defaultType,
        description: category.description || '',
        icon: category.icon || 'FaTags',
        color: category.color || 'blue',
        is_active: category.is_active !== false,
        sort_order: category.sort_order || 0
      });
    } else {
      setFormData({
        code: '',
        name: '',
        type: defaultType,
        description: '',
        icon: 'FaTags',
        color: 'blue',
        is_active: true,
        sort_order: 0
      });
    }
    setErrors({});
  }, [category, mode, isOpen, defaultType]);

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      const dataToSave = mode === 'edit' 
        ? { id: category.id, ...formData }
        : formData;

      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Tambah Kategori' : 'Edit Kategori'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? `Tambahkan kategori ${formData.type === 'income' ? 'pendapatan' : 'pengeluaran'} baru`
              : 'Perbarui informasi kategori'}
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
                placeholder="EXP_OPS"
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
                placeholder="Operasional"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipe *</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value: 'income' | 'expense') => setFormData({ ...formData, type: value })}
              disabled={mode === 'edit'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Pengeluaran</SelectItem>
                <SelectItem value="income">Pendapatan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Deskripsi kategori"
              rows={2}
            />
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
              <Label htmlFor="color">Warna</Label>
              <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded bg-${option.value}-500`}></div>
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="flex items-center space-x-2 pt-8">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Aktif</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className={formData.type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {loading ? 'Menyimpan...' : mode === 'create' ? 'Tambah' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
