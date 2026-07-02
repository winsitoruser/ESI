import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface BankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  bankAccount?: any;
  mode: 'create' | 'edit';
}

export default function BankAccountModal({ isOpen, onClose, onSave, bankAccount, mode }: BankAccountModalProps) {
  const [formData, setFormData] = useState({
    bank_name: '',
    bank_code: '',
    account_number: '',
    account_name: '',
    branch: '',
    swift_code: '',
    is_primary: false,
    is_active: true,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (bankAccount && mode === 'edit') {
      setFormData({
        bank_name: bankAccount.bank_name || '',
        bank_code: bankAccount.bank_code || '',
        account_number: bankAccount.account_number || '',
        account_name: bankAccount.account_name || '',
        branch: bankAccount.branch || '',
        swift_code: bankAccount.swift_code || '',
        is_primary: bankAccount.is_primary || false,
        is_active: bankAccount.is_active !== false,
        notes: bankAccount.notes || ''
      });
    } else {
      setFormData({
        bank_name: '',
        bank_code: '',
        account_number: '',
        account_name: '',
        branch: '',
        swift_code: '',
        is_primary: false,
        is_active: true,
        notes: ''
      });
    }
    setErrors({});
  }, [bankAccount, mode, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.bank_name.trim()) {
      newErrors.bank_name = 'Nama bank wajib diisi';
    }

    if (!formData.account_number.trim()) {
      newErrors.account_number = 'Nomor rekening wajib diisi';
    } else if (!/^\d+$/.test(formData.account_number)) {
      newErrors.account_number = 'Nomor rekening harus berupa angka';
    }

    if (!formData.account_name.trim()) {
      newErrors.account_name = 'Nama pemilik rekening wajib diisi';
    }

    if (formData.bank_code && !/^\d{3}$/.test(formData.bank_code)) {
      newErrors.bank_code = 'Kode bank harus 3 digit angka';
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
        ? { id: bankAccount.id, ...formData }
        : formData;

      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error('Error saving bank account:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Tambah Rekening Bank' : 'Edit Rekening Bank'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Tambahkan rekening bank perusahaan'
              : 'Perbarui informasi rekening bank'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Nama Bank *</Label>
              <Input
                id="bank_name"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Bank Central Asia"
                className={errors.bank_name ? 'border-red-500' : ''}
              />
              {errors.bank_name && <p className="text-xs text-red-500">{errors.bank_name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_code">Kode Bank</Label>
              <Input
                id="bank_code"
                value={formData.bank_code}
                onChange={(e) => setFormData({ ...formData, bank_code: e.target.value })}
                placeholder="014"
                maxLength={3}
                className={errors.bank_code ? 'border-red-500' : ''}
              />
              {errors.bank_code && <p className="text-xs text-red-500">{errors.bank_code}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_number">Nomor Rekening *</Label>
              <Input
                id="account_number"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="1234567890"
                className={errors.account_number ? 'border-red-500' : ''}
              />
              {errors.account_number && <p className="text-xs text-red-500">{errors.account_number}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_name">Atas Nama *</Label>
              <Input
                id="account_name"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                placeholder="PT Bedagang Indonesia"
                className={errors.account_name ? 'border-red-500' : ''}
              />
              {errors.account_name && <p className="text-xs text-red-500">{errors.account_name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch">Cabang</Label>
              <Input
                id="branch"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                placeholder="Jakarta Pusat"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="swift_code">SWIFT Code</Label>
              <Input
                id="swift_code"
                value={formData.swift_code}
                onChange={(e) => setFormData({ ...formData, swift_code: e.target.value.toUpperCase() })}
                placeholder="CENAIDJA"
                maxLength={11}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Catatan tambahan tentang rekening ini"
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_primary"
                checked={formData.is_primary}
                onCheckedChange={(checked) => setFormData({ ...formData, is_primary: checked })}
              />
              <Label htmlFor="is_primary">Rekening Utama</Label>
            </div>

            <div className="flex items-center space-x-2">
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
            <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? 'Menyimpan...' : mode === 'create' ? 'Tambah' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
