import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import {
  FaTimes, FaFlask, FaBoxOpen, FaCheckCircle, FaExclamationTriangle,
  FaCalendarAlt, FaUser, FaStickyNote, FaCalculator
} from 'react-icons/fa';

interface Recipe {
  id: string;
  name: string;
  sku: string;
  batchSize: number;
  batchUnit: string;
  ingredients: {
    materialId: string;
    materialName: string;
    quantity: number;
    unit: string;
    available: number;
  }[];
  totalCost: number;
  costPerUnit: number;
}

interface ProductionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: Recipe[];
  onSubmit: (data: any) => void;
}

const ProductionFormModal: React.FC<ProductionFormModalProps> = ({
  isOpen,
  onClose,
  recipes,
  onSubmit
}) => {
  const { formatCurrency } = useTranslation();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [batchMultiplier, setBatchMultiplier] = useState(1);
  const [plannedQuantity, setPlannedQuantity] = useState(0);
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [producedBy, setProducedBy] = useState('Admin');

  useEffect(() => {
    if (selectedRecipe) {
      setPlannedQuantity(selectedRecipe.batchSize * batchMultiplier);
    }
  }, [selectedRecipe, batchMultiplier]);


  const checkMaterialAvailability = (recipe: Recipe, multiplier: number) => {
    return recipe.ingredients.every(ing => ing.available >= ing.quantity * multiplier);
  };

  const getMaxBatches = (recipe: Recipe) => {
    const maxBatches = recipe.ingredients.map(ing => 
      Math.floor(ing.available / ing.quantity)
    );
    return Math.min(...maxBatches);
  };

  const calculateTotalCost = () => {
    if (!selectedRecipe) return 0;
    return selectedRecipe.totalCost * batchMultiplier;
  };

  const calculateCostPerUnit = () => {
    if (!selectedRecipe || plannedQuantity === 0) return 0;
    return calculateTotalCost() / plannedQuantity;
  };

  const handleSubmit = () => {
    if (!selectedRecipe) return;

    const productionData = {
      recipeId: selectedRecipe.id,
      recipeName: selectedRecipe.name,
      productSku: selectedRecipe.sku,
      plannedQuantity,
      batchMultiplier,
      unit: selectedRecipe.batchUnit,
      productionDate,
      materialsNeeded: selectedRecipe.ingredients.map(ing => ({
        materialId: ing.materialId,
        materialName: ing.materialName,
        plannedQty: ing.quantity * batchMultiplier,
        unit: ing.unit,
        available: ing.available
      })),
      totalCost: calculateTotalCost(),
      costPerUnit: calculateCostPerUnit(),
      producedBy,
      notes
    };

    onSubmit(productionData);
    handleClose();
  };

  const handleClose = () => {
    setSelectedRecipe(null);
    setBatchMultiplier(1);
    setPlannedQuantity(0);
    setNotes('');
    onClose();
  };

  if (!isOpen) return null;

  const isFormValid = selectedRecipe && batchMultiplier > 0 && plannedQuantity > 0;
  const hasEnoughMaterials = selectedRecipe ? checkMaterialAvailability(selectedRecipe, batchMultiplier) : false;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <FaFlask className="mr-3 text-indigo-600" />
                Form Produksi Baru
              </h2>
              <p className="text-sm text-gray-600 mt-1">Pilih resep dan tentukan jumlah produksi</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Select Recipe */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center mr-2 text-sm">1</span>
              Pilih Resep Produk
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recipes.map((recipe) => {
                const maxBatches = getMaxBatches(recipe);
                const isSelected = selectedRecipe?.id === recipe.id;
                
                return (
                  <div
                    key={recipe.id}
                    onClick={() => setSelectedRecipe(recipe)}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{recipe.name}</h4>
                        <p className="text-xs text-gray-500">SKU: {recipe.sku}</p>
                      </div>
                      {isSelected && (
                        <FaCheckCircle className="text-indigo-600 text-xl" />
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-white rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500">Ukuran Batch</p>
                        <p className="text-sm font-semibold text-gray-900">{recipe.batchSize} {recipe.batchUnit}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Biaya per Batch</p>
                        <p className="text-sm font-semibold text-green-600">{formatCurrency(recipe.totalCost)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Max Batch: {maxBatches}x</span>
                      {maxBatches === 0 ? (
                        <Badge className="bg-red-100 text-red-700">
                          <FaExclamationTriangle className="mr-1" />
                          Bahan Habis
                        </Badge>
                      ) : maxBatches < 5 ? (
                        <Badge className="bg-yellow-100 text-yellow-700">
                          <FaExclamationTriangle className="mr-1" />
                          Bahan Terbatas
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700">
                          <FaCheckCircle className="mr-1" />
                          Tersedia
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Set Quantity */}
          {selectedRecipe && (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center mr-2 text-sm">2</span>
                  Tentukan Jumlah Produksi
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Jumlah Batch
                    </label>
                    <div className="flex items-center space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setBatchMultiplier(Math.max(1, batchMultiplier - 1))}
                        disabled={batchMultiplier <= 1}
                        className="px-4"
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        value={batchMultiplier}
                        onChange={(e) => setBatchMultiplier(Math.max(1, parseInt(e.target.value) || 1))}
                        className="text-center text-lg font-bold"
                        min={1}
                        max={getMaxBatches(selectedRecipe)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setBatchMultiplier(Math.min(getMaxBatches(selectedRecipe), batchMultiplier + 1))}
                        disabled={batchMultiplier >= getMaxBatches(selectedRecipe)}
                        className="px-4"
                      >
                        +
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Max: {getMaxBatches(selectedRecipe)} batch berdasarkan ketersediaan bahan
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Total Produksi
                    </label>
                    <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
                      <p className="text-3xl font-bold text-indigo-600">
                        {plannedQuantity} {selectedRecipe.batchUnit}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {batchMultiplier} batch × {selectedRecipe.batchSize} {selectedRecipe.batchUnit}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Material Requirements */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FaBoxOpen className="mr-2 text-indigo-600" />
                  Kebutuhan Bahan Baku
                </h3>
                
                {!hasEnoughMaterials && (
                  <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                    <div className="flex items-center">
                      <FaExclamationTriangle className="text-red-600 mr-2" />
                      <p className="text-sm text-red-700 font-semibold">
                        Peringatan: Bahan baku tidak mencukupi untuk jumlah batch yang dipilih!
                      </p>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Bahan</th>
                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Dibutuhkan</th>
                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Tersedia</th>
                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecipe.ingredients.map((ing, idx) => {
                        const needed = ing.quantity * batchMultiplier;
                        const isEnough = ing.available >= needed;
                        
                        return (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="p-3">
                              <p className="font-medium text-gray-900">{ing.materialName}</p>
                            </td>
                            <td className="p-3 text-center">
                              <p className="font-semibold text-indigo-600">{needed} {ing.unit}</p>
                            </td>
                            <td className="p-3 text-center">
                              <p className={`font-semibold ${isEnough ? 'text-green-600' : 'text-red-600'}`}>
                                {ing.available} {ing.unit}
                              </p>
                            </td>
                            <td className="p-3 text-center">
                              {isEnough ? (
                                <Badge className="bg-green-100 text-green-700">
                                  <FaCheckCircle className="mr-1" />
                                  Cukup
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700">
                                  <FaExclamationTriangle className="mr-1" />
                                  Kurang {(needed - ing.available).toFixed(2)} {ing.unit}
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cost Summary */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FaCalculator className="mr-2 text-indigo-600" />
                  Ringkasan Biaya
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-600 mb-1">Total Biaya Produksi</p>
                    <p className="text-xl font-bold text-blue-700">{formatCurrency(calculateTotalCost())}</p>
                  </div>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-600 mb-1">Biaya per Unit</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(calculateCostPerUnit())}</p>
                  </div>
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-xs text-purple-600 mb-1">Total Unit</p>
                    <p className="text-xl font-bold text-purple-700">{plannedQuantity} {selectedRecipe.batchUnit}</p>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FaStickyNote className="mr-2 text-indigo-600" />
                  Informasi Tambahan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <FaCalendarAlt className="inline mr-2" />
                      Tanggal Produksi
                    </label>
                    <Input
                      type="date"
                      value={productionDate}
                      onChange={(e) => setProductionDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <FaUser className="inline mr-2" />
                      Diproduksi Oleh
                    </label>
                    <Input
                      type="text"
                      value={producedBy}
                      onChange={(e) => setProducedBy(e.target.value)}
                      placeholder="Nama operator produksi"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Catatan
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Tambahkan catatan produksi (opsional)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                  />
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleClose}
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || !hasEnoughMaterials}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <FaCheckCircle className="mr-2" />
              Mulai Produksi
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionFormModal;
