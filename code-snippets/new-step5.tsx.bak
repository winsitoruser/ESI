// Step 5 Component - To be inserted into main form
// This is the JSX for Step 5: Detail & Media

{/* Step 5: Detail & Media */}
{currentStep === 5 && (
  <Card className="border-0 shadow-xl">
    <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50">
      <CardTitle className="flex items-center text-pink-900">
        <FaBox className="mr-3" />
        Step 5: Detail Produk & Media
      </CardTitle>
    </CardHeader>
    <CardContent className="p-8 space-y-6">
      {/* Image Upload Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-blue-900">
            📸 Gambar Produk
          </h3>
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploadingImage}
            />
            <Button
              type="button"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={uploadingImage}
            >
              {uploadingImage ? 'Mengunggah...' : '+ Upload Gambar'}
            </Button>
          </label>
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((img, index) => (
              <div key={index} className="relative group">
                <img
                  src={img}
                  alt={`Product ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <FaTimes />
                </button>
                {index === 0 && (
                  <Badge className="absolute bottom-2 left-2 bg-blue-600">
                    Thumbnail
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Belum ada gambar. Upload gambar produk untuk tampilan yang lebih menarik.
          </div>
        )}
      </div>

      {/* Product Variants Section */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-green-900">
            🎨 Varian Produk
          </h3>
          <Button
            type="button"
            onClick={handleAddVariant}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            <FaPlus className="mr-2" />
            Tambah Varian
          </Button>
        </div>

        {variants.length > 0 ? (
          <div className="space-y-3">
            {variants.map((variant) => (
              <div key={variant.id} className="bg-white rounded-lg p-4 border-2 border-green-100">
                <div className="flex items-start space-x-3">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nama Varian
                      </label>
                      <input
                        type="text"
                        value={variant.variant_name}
                        onChange={(e) => handleVariantChange(variant.id, 'variant_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="e.g., Small, Red, 250ml"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Tipe Varian
                      </label>
                      <select
                        value={variant.variant_type}
                        onChange={(e) => handleVariantChange(variant.id, 'variant_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="size">Size (Ukuran)</option>
                        <option value="color">Color (Warna)</option>
                        <option value="flavor">Flavor (Rasa)</option>
                        <option value="material">Material (Bahan)</option>
                        <option value="volume">Volume</option>
                        <option value="weight">Weight (Berat)</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        SKU Varian
                      </label>
                      <input
                        type="text"
                        value={variant.sku}
                        onChange={(e) => handleVariantChange(variant.id, 'sku', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Optional"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Harga
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={variant.price}
                        onChange={(e) => handleVariantChange(variant.id, 'price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Override"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Stok
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={variant.stock}
                        onChange={(e) => handleVariantChange(variant.id, 'stock', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => handleRemoveVariant(variant.id)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50 mt-6"
                  >
                    <FaTrash />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">
            Tidak ada varian. Tambahkan varian jika produk memiliki ukuran, warna, atau tipe berbeda.
          </div>
        )}
      </div>

      {/* Detailed Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Deskripsi Lengkap
        </label>
        <textarea
          value={detailedInfo.long_description}
          onChange={(e) => handleDetailedInfoChange('long_description', e.target.value)}
          rows={6}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
          placeholder="Deskripsi detail tentang produk, keunggulan, manfaat, dll."
        />
      </div>

      {/* Dimensions & Weight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Dimensi & Berat</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Berat
              </label>
              <input
                type="number"
                step="0.001"
                value={detailedInfo.weight}
                onChange={(e) => handleDetailedInfoChange('weight', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Unit
              </label>
              <select
                value={detailedInfo.weight_unit}
                onChange={(e) => handleDetailedInfoChange('weight_unit', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="kg">Kg</option>
                <option value="gram">Gram</option>
                <option value="lb">Lb</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Panjang
              </label>
              <input
                type="number"
                step="0.01"
                value={detailedInfo.length}
                onChange={(e) => handleDetailedInfoChange('length', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Lebar
              </label>
              <input
                type="number"
                step="0.01"
                value={detailedInfo.width}
                onChange={(e) => handleDetailedInfoChange('width', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tinggi
              </label>
              <input
                type="number"
                step="0.01"
                value={detailedInfo.height}
                onChange={(e) => handleDetailedInfoChange('height', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Informasi Tambahan</h4>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Brand/Merek
            </label>
            <input
              type="text"
              value={detailedInfo.brand}
              onChange={(e) => handleDetailedInfoChange('brand', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Nama brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Produsen
            </label>
            <input
              type="text"
              value={detailedInfo.manufacturer}
              onChange={(e) => handleDetailedInfoChange('manufacturer', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Nama produsen"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Negara Asal
            </label>
            <input
              type="text"
              value={detailedInfo.country_of_origin}
              onChange={(e) => handleDetailedInfoChange('country_of_origin', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g., Indonesia"
            />
          </div>
        </div>
      </div>

      {/* Ingredients & Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Komposisi/Bahan
          </label>
          <textarea
            value={detailedInfo.ingredients}
            onChange={(e) => handleDetailedInfoChange('ingredients', e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
            placeholder="Daftar bahan/komposisi produk"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Cara Penggunaan
          </label>
          <textarea
            value={detailedInfo.usage_instructions}
            onChange={(e) => handleDetailedInfoChange('usage_instructions', e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
            placeholder="Instruksi penggunaan produk"
          />
        </div>
      </div>

      {/* Warnings & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Peringatan
          </label>
          <textarea
            value={detailedInfo.warnings}
            onChange={(e) => handleDetailedInfoChange('warnings', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
            placeholder="Peringatan atau perhatian khusus"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Catatan Internal
          </label>
          <textarea
            value={detailedInfo.internal_notes}
            onChange={(e) => handleDetailedInfoChange('internal_notes', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
            placeholder="Catatan internal (tidak tampil ke customer)"
          />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Tags (pisahkan dengan koma)
        </label>
        <input
          type="text"
          value={detailedInfo.tags}
          onChange={(e) => handleDetailedInfoChange('tags', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
          placeholder="e.g., premium, organic, best-seller"
        />
      </div>
    </CardContent>
  </Card>
)}
