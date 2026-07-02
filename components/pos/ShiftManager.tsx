import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FaClock, FaLock, FaUnlock, FaMoneyBillWave } from 'react-icons/fa';

interface ShiftManagerProps {
  onShiftOpen?: (data: any) => void;
  onShiftClose?: (data: any) => void;
  currentShift?: any;
}

const ShiftManager: React.FC<ShiftManagerProps> = ({
  onShiftOpen,
  onShiftClose,
  currentShift
}) => {
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');

  const handleOpenShift = () => {
    if (!openingCash) {
      alert('Masukkan saldo awal kas');
      return;
    }

    const shiftData = {
      openingCash: parseFloat(openingCash),
      notes,
      openedAt: new Date()
    };

    onShiftOpen?.(shiftData);
    setOpeningCash('');
    setNotes('');
  };

  const handleCloseShift = () => {
    if (!closingCash) {
      alert('Masukkan saldo akhir kas');
      return;
    }

    const shiftData = {
      closingCash: parseFloat(closingCash),
      notes,
      closedAt: new Date()
    };

    onShiftClose?.(shiftData);
    setClosingCash('');
    setNotes('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {!currentShift ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FaUnlock className="text-green-600" />
              <span>Buka Shift</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="openingCash">Saldo Awal Kas</Label>
              <Input
                id="openingCash"
                type="number"
                placeholder="0"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="notes">Catatan (Opsional)</Label>
              <Input
                id="notes"
                placeholder="Catatan shift..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
              />
            </div>

            <Button 
              onClick={handleOpenShift}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <FaUnlock className="mr-2" />
              Buka Shift
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <FaClock className="text-green-600 text-xl" />
                  <span className="font-semibold text-green-800">Shift Aktif</span>
                </div>
                <span className="text-sm text-green-600">
                  {new Date(currentShift.openedAt).toLocaleTimeString('id-ID')}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Saldo Awal:</span>
                  <span className="font-semibold">
                    {formatCurrency(currentShift.openingCash)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Transaksi:</span>
                  <span className="font-semibold">{currentShift.transactionCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Penjualan:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(currentShift.totalSales || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FaLock className="text-red-600" />
                <span>Tutup Shift</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="closingCash">Saldo Akhir Kas</Label>
                <Input
                  id="closingCash"
                  type="number"
                  placeholder="0"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="closeNotes">Catatan Penutupan</Label>
                <Input
                  id="closeNotes"
                  placeholder="Catatan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                />
              </div>

              <Button 
                onClick={handleCloseShift}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <FaLock className="mr-2" />
                Tutup Shift
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ShiftManager;
