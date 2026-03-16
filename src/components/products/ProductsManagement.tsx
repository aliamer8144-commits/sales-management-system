'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Package, Plus, Search, Trash2, Edit, X, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Product, ProductUnit, ProductFormData } from '@/types';

const initialFormData: ProductFormData = {
  name: '',
  alertLimit: '5',
  alertUnitType: 'piece',
  notes: '',
  baseUnitType: 'piece',
  cartonPurchasePrice: '',
  cartonPacketsCount: '',
  packetPiecesCount: '',
  packetPurchasePrice: '',
  piecePurchasePrice: '',
  cartonStock: '',
  packetStock: '',
  pieceStock: '',
};

export function ProductsManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch(`/api/products?search=${search}`);
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fetch products error:', error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingProduct(null);
  };

  const buildUnits = (): ProductUnit[] => {
    const units: ProductUnit[] = [];

    if (formData.baseUnitType === 'carton') {
      const cartonPrice = parseFloat(formData.cartonPurchasePrice) || 0;
      const packetsInCarton = parseInt(formData.cartonPacketsCount) || 1;
      const piecesInPacket = parseInt(formData.packetPiecesCount) || 1;
      const totalPieces = packetsInCarton * piecesInPacket;

      units.push({
        unitType: 'carton',
        unitName: 'كرتون',
        purchasePrice: cartonPrice,
        containsPieces: totalPieces,
        stockQuantity: parseInt(formData.cartonStock) || 0,
      });
      units.push({
        unitType: 'packet',
        unitName: 'باكت',
        purchasePrice: cartonPrice / packetsInCarton,
        containsPieces: piecesInPacket,
        stockQuantity: parseInt(formData.packetStock) || 0,
      });
      units.push({
        unitType: 'piece',
        unitName: 'قطعة',
        purchasePrice: cartonPrice / totalPieces,
        containsPieces: 1,
        stockQuantity: parseInt(formData.pieceStock) || 0,
      });
    } else if (formData.baseUnitType === 'packet') {
      const packetPrice = parseFloat(formData.packetPurchasePrice) || 0;
      const piecesInPacket = parseInt(formData.packetPiecesCount) || 1;

      units.push({
        unitType: 'packet',
        unitName: 'باكت',
        purchasePrice: packetPrice,
        containsPieces: piecesInPacket,
        stockQuantity: parseInt(formData.packetStock) || 0,
      });
      units.push({
        unitType: 'piece',
        unitName: 'قطعة',
        purchasePrice: packetPrice / piecesInPacket,
        containsPieces: 1,
        stockQuantity: parseInt(formData.pieceStock) || 0,
      });
    } else {
      units.push({
        unitType: 'piece',
        unitName: 'قطعة',
        purchasePrice: parseFloat(formData.piecePurchasePrice) || 0,
        containsPieces: 1,
        stockQuantity: parseInt(formData.pieceStock) || 0,
      });
    }

    return units;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const units = buildUnits();

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const response = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          alertLimit: parseInt(formData.alertLimit),
          alertUnitType: formData.alertUnitType,
          notes: formData.notes,
          units,
        }),
      });

      if (response.ok) {
        toast({ title: 'تم بنجاح' });
        setShowForm(false);
        resetForm();
        fetchProducts();
      } else {
        const error = await response.json();
        toast({ title: 'خطأ', description: error.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    toast({ title: 'تم الحذف' });
    fetchProducts();
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    const hasCarton = product.units.some((u) => u.unitType === 'carton');
    const hasPacket = product.units.some((u) => u.unitType === 'packet');
    const baseUnitType = hasCarton ? 'carton' : hasPacket ? 'packet' : 'piece';

    const cartonUnit = product.units.find((u) => u.unitType === 'carton');
    const packetUnit = product.units.find((u) => u.unitType === 'packet');
    const pieceUnit = product.units.find((u) => u.unitType === 'piece');

    setFormData({
      name: product.name,
      alertLimit: product.alertLimit.toString(),
      alertUnitType: (product.alertUnitType as 'carton' | 'packet' | 'piece') || 'piece',
      notes: product.notes || '',
      baseUnitType,
      cartonPurchasePrice: cartonUnit?.purchasePrice.toString() || '',
      cartonPacketsCount:
        cartonUnit && packetUnit
          ? (cartonUnit.containsPieces / packetUnit.containsPieces).toString()
          : '',
      packetPiecesCount: packetUnit?.containsPieces.toString() || '',
      packetPurchasePrice: packetUnit?.purchasePrice.toString() || '',
      piecePurchasePrice: pieceUnit?.purchasePrice.toString() || '',
      cartonStock: cartonUnit?.stockQuantity.toString() || '',
      packetStock: packetUnit?.stockQuantity.toString() || '',
      pieceStock: pieceUnit?.stockQuantity.toString() || '',
    });
    setShowForm(true);
  };

  // Get available unit types for alert based on base unit type
  const getAvailableAlertUnits = () => {
    const units: { value: 'carton' | 'packet' | 'piece'; label: string }[] = [];
    if (formData.baseUnitType === 'carton') {
      units.push({ value: 'carton', label: 'كرتون' });
      units.push({ value: 'packet', label: 'باكت' });
      units.push({ value: 'piece', label: 'قطعة' });
    } else if (formData.baseUnitType === 'packet') {
      units.push({ value: 'packet', label: 'باكت' });
      units.push({ value: 'piece', label: 'قطعة' });
    } else {
      units.push({ value: 'piece', label: 'قطعة' });
    }
    return units;
  };

  // Calculated prices
  const calcPacketPrice =
    formData.baseUnitType === 'carton' && formData.cartonPurchasePrice && formData.cartonPacketsCount
      ? (parseFloat(formData.cartonPurchasePrice) / parseInt(formData.cartonPacketsCount)).toFixed(2)
      : '';

  const calcPiecePrice =
    formData.baseUnitType === 'carton' &&
    formData.cartonPurchasePrice &&
    formData.cartonPacketsCount &&
    formData.packetPiecesCount
      ? (
          parseFloat(formData.cartonPurchasePrice) /
          (parseInt(formData.cartonPacketsCount) * parseInt(formData.packetPiecesCount))
        ).toFixed(2)
      : formData.baseUnitType === 'packet' && formData.packetPurchasePrice && formData.packetPiecesCount
      ? (parseFloat(formData.packetPurchasePrice) / parseInt(formData.packetPiecesCount)).toFixed(2)
      : '';

  return (
    <div className="p-4 pb-24">
      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          placeholder="البحث عن منتج..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10 h-12"
        />
      </div>

      <Button
        className="w-full h-12 mb-4 bg-gradient-to-r from-teal-500 to-emerald-600"
        onClick={() => {
          resetForm();
          setShowForm(true);
        }}
      >
        <Plus className="h-5 w-5 ml-2" />
        إضافة منتج جديد
      </Button>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <Card className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>اسم المنتج *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="h-12"
                  />
                </div>

                <div>
                  <Label>الوحدة الأساسية *</Label>
                  <Select
                    value={formData.baseUnitType}
                    onValueChange={(v) => setFormData({ 
                      ...formData, 
                      baseUnitType: v as 'carton' | 'packet' | 'piece',
                      alertUnitType: v as 'carton' | 'packet' | 'piece'
                    })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carton">كرتون (مع باكت وقطعة)</SelectItem>
                      <SelectItem value="packet">باكت (مع قطعة)</SelectItem>
                      <SelectItem value="piece">قطعة فقط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Carton Fields */}
                {formData.baseUnitType === 'carton' && (
                  <div className="space-y-3 p-3 bg-teal-50 rounded-lg">
                    <h4 className="font-semibold text-teal-800">بيانات الكرتون</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">سعر شراء الكرتون *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.cartonPurchasePrice}
                          onChange={(e) => setFormData({ ...formData, cartonPurchasePrice: e.target.value })}
                          required
                          className="h-10"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">عدد البواكت في الكرتون *</Label>
                        <Input
                          type="number"
                          value={formData.cartonPacketsCount}
                          onChange={(e) => setFormData({ ...formData, cartonPacketsCount: e.target.value })}
                          required
                          className="h-10"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">عدد القطع في الباكت *</Label>
                        <Input
                          type="number"
                          value={formData.packetPiecesCount}
                          onChange={(e) => setFormData({ ...formData, packetPiecesCount: e.target.value })}
                          required
                          className="h-10"
                        />
                      </div>
                    </div>
                    {calcPacketPrice && (
                      <p className="text-sm text-teal-700">
                        سعر الباكت المحسوب: <strong>{calcPacketPrice} ﷼</strong>
                      </p>
                    )}
                    {calcPiecePrice && (
                      <p className="text-sm text-teal-700">
                        سعر القطعة المحسوب: <strong>{calcPiecePrice} ﷼</strong>
                      </p>
                    )}
                  </div>
                )}

                {/* Packet Fields */}
                {formData.baseUnitType === 'packet' && (
                  <div className="space-y-3 p-3 bg-emerald-50 rounded-lg">
                    <h4 className="font-semibold text-emerald-800">بيانات الباكت</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">سعر شراء الباكت *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.packetPurchasePrice}
                          onChange={(e) => setFormData({ ...formData, packetPurchasePrice: e.target.value })}
                          required
                          className="h-10"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">عدد القطع في الباكت *</Label>
                        <Input
                          type="number"
                          value={formData.packetPiecesCount}
                          onChange={(e) => setFormData({ ...formData, packetPiecesCount: e.target.value })}
                          required
                          className="h-10"
                        />
                      </div>
                    </div>
                    {calcPiecePrice && (
                      <p className="text-sm text-emerald-700">
                        سعر القطعة المحسوب: <strong>{calcPiecePrice} ﷼</strong>
                      </p>
                    )}
                  </div>
                )}

                {/* Piece Fields */}
                {formData.baseUnitType === 'piece' && (
                  <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-800">بيانات القطعة</h4>
                    <div>
                      <Label className="text-xs">سعر شراء القطعة *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.piecePurchasePrice}
                        onChange={(e) => setFormData({ ...formData, piecePurchasePrice: e.target.value })}
                        required
                        className="h-10"
                      />
                    </div>
                  </div>
                )}

                {/* Stock Section - Separate for each unit */}
                <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    المخزون
                  </h4>
                  
                  {formData.baseUnitType === 'carton' && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">كراتين</Label>
                        <Input
                          type="number"
                          value={formData.cartonStock}
                          onChange={(e) => setFormData({ ...formData, cartonStock: e.target.value })}
                          className="h-10"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">بواكت</Label>
                        <Input
                          type="number"
                          value={formData.packetStock}
                          onChange={(e) => setFormData({ ...formData, packetStock: e.target.value })}
                          className="h-10"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">قطع</Label>
                        <Input
                          type="number"
                          value={formData.pieceStock}
                          onChange={(e) => setFormData({ ...formData, pieceStock: e.target.value })}
                          className="h-10"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}

                  {formData.baseUnitType === 'packet' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">بواكت</Label>
                        <Input
                          type="number"
                          value={formData.packetStock}
                          onChange={(e) => setFormData({ ...formData, packetStock: e.target.value })}
                          className="h-10"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">قطع</Label>
                        <Input
                          type="number"
                          value={formData.pieceStock}
                          onChange={(e) => setFormData({ ...formData, pieceStock: e.target.value })}
                          className="h-10"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}

                  {formData.baseUnitType === 'piece' && (
                    <div>
                      <Label className="text-xs">قطع</Label>
                      <Input
                        type="number"
                        value={formData.pieceStock}
                        onChange={(e) => setFormData({ ...formData, pieceStock: e.target.value })}
                        className="h-10"
                        placeholder="0"
                      />
                    </div>
                  )}
                </div>

                {/* Alert Section */}
                <div className="space-y-3 p-3 bg-amber-50 rounded-lg">
                  <h4 className="font-semibold text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    تنبيه المخزون
                  </h4>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">الحد</Label>
                      <Input
                        type="number"
                        value={formData.alertLimit}
                        onChange={(e) => setFormData({ ...formData, alertLimit: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">الوحدة</Label>
                      <Select
                        value={formData.alertUnitType}
                        onValueChange={(v) => setFormData({ ...formData, alertUnitType: v as 'carton' | 'packet' | 'piece' })}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableAlertUnits().map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-amber-700">
                    سيتم التنبيه عند وصول المخزون إلى {formData.alertLimit} {getAvailableAlertUnits().find(u => u.value === formData.alertUnitType)?.label} أو أقل
                  </p>
                </div>

                <div>
                  <Label>ملاحظات</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-4 pb-6">
                  <Button
                    type="submit"
                    className="flex-1 h-12 bg-gradient-to-r from-teal-500 to-emerald-600"
                  >
                    {editingProduct ? 'حفظ التغييرات' : 'إضافة المنتج'}
                  </Button>
                  <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setShowForm(false)}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Products List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">لا توجد منتجات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => {
            const alertUnit = product.units.find(u => u.unitType === product.alertUnitType);
            const isLowStock = alertUnit && alertUnit.stockQuantity <= product.alertLimit;
            
            return (
              <Card key={product.id} className={`shadow-sm ${isLowStock ? 'border-amber-300 bg-amber-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{product.name}</h3>
                        {isLowStock && (
                          <Badge className="bg-amber-100 text-amber-700 text-xs">
                            <AlertTriangle className="h-3 w-3 ml-1" />
                            مخزون منخفض
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {product.units.map((unit, idx) => (
                          <Badge
                            key={unit.id || idx}
                            variant="outline"
                            className={unit.stockQuantity > 0 ? 'bg-teal-50' : 'bg-gray-50'}
                          >
                            {unit.unitName}: {unit.stockQuantity}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        تنبيه عند: {product.alertLimit} {alertUnit?.unitName || 'قطعة'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(product)}>
                        <Edit className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
