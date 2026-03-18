'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  Package,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Product, ProductUnit } from '@/types';
import { CurrencyDisplay } from '@/components/ui/saudi-riyal-symbol';

// Calculate total pieces from units
function calculateTotalPieces(units: ProductUnit[]): number {
  return units.reduce((total, unit) => {
    return total + (unit.stockQuantity * unit.containsPieces);
  }, 0);
}

// Convert total pieces to display format
function convertPiecesToUnits(totalPieces: number, units: ProductUnit[]): { cartons: number; packets: number; pieces: number } {
  const cartonUnit = units.find(u => u.unitType === 'carton');
  const packetUnit = units.find(u => u.unitType === 'packet');

  const cartonPieces = cartonUnit?.containsPieces || 1;
  const packetPieces = packetUnit?.containsPieces || 1;

  let remaining = totalPieces;

  const cartons = cartonUnit ? Math.floor(remaining / cartonPieces) : 0;
  if (cartonUnit) remaining = remaining % cartonPieces;

  const packets = packetUnit ? Math.floor(remaining / packetPieces) : 0;
  if (packetUnit) remaining = remaining % packetPieces;

  const pieces = remaining;

  return { cartons, packets, pieces };
}

// Format stock display
function formatStockDisplay(units: ProductUnit[]): string {
  const totalPieces = calculateTotalPieces(units);
  const { cartons, packets, pieces } = convertPiecesToUnits(totalPieces, units);

  const parts: string[] = [];
  if (cartons > 0) parts.push(`${cartons} كرتون`);
  if (packets > 0) parts.push(`${packets} باكت`);
  if (pieces > 0) parts.push(`${pieces} قطعة`);

  return parts.length > 0 ? parts.join('، ') : '0';
}

// Format stock from pieces
function formatPiecesToStock(totalPieces: number, units: ProductUnit[]): string {
  const { cartons, packets, pieces } = convertPiecesToUnits(totalPieces, units);

  const parts: string[] = [];
  if (cartons > 0) parts.push(`${cartons} كرتون`);
  if (packets > 0) parts.push(`${packets} باكت`);
  if (pieces > 0) parts.push(`${pieces} قطعة`);

  return parts.length > 0 ? parts.join('، ') : '0';
}

interface ComparedProduct {
  productId: string;
  productName: string;
  systemStock: number; // in pieces
  actualStock: number; // in pieces
  difference: number; // in pieces
  loss: number; // in money (purchase price × difference)
  units: ProductUnit[];
}

export function InventoryCheck() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMatching, setShowMatching] = useState(false);

  // Matching state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [comparedProducts, setComparedProducts] = useState<ComparedProduct[]>([]);
  const [actualStockInput, setActualStockInput] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get products that haven't been compared yet
  const pendingProducts = useMemo(() => {
    const comparedIds = new Set(comparedProducts.map(p => p.productId));
    return products.filter(p => !comparedIds.has(p.id));
  }, [products, comparedProducts]);

  // Current product to compare
  const currentProduct = pendingProducts[currentIndex] || null;

  // Calculate total loss
  const totalLoss = useMemo(() => {
    return comparedProducts.reduce((sum, p) => sum + p.loss, 0);
  }, [comparedProducts]);

  // Start matching
  const startMatching = () => {
    if (products.length === 0) {
      toast({ title: 'لا توجد منتجات', description: 'لا توجد منتجات للمطابقة', variant: 'destructive' });
      return;
    }
    setShowMatching(true);
    setCurrentIndex(0);
    setComparedProducts([]);
    setActualStockInput('');
  };

  // Confirm current product
  const confirmProduct = () => {
    if (!currentProduct) return;

    const actualStock = parseInt(actualStockInput) || 0;
    const systemStock = calculateTotalPieces(currentProduct.units);
    const difference = actualStock - systemStock;

    // Calculate loss (only if negative difference - missing stock)
    // Use average purchase price per piece
    const avgPurchasePrice = currentProduct.units.reduce((sum, u) => {
      return sum + (u.purchasePrice * u.stockQuantity);
    }, 0) / (systemStock || 1);

    const loss = difference < 0 ? Math.abs(difference) * avgPurchasePrice : 0;

    const comparedItem: ComparedProduct = {
      productId: currentProduct.id,
      productName: currentProduct.name,
      systemStock,
      actualStock,
      difference,
      loss,
      units: currentProduct.units,
    };

    setComparedProducts(prev => [...prev, comparedItem]);
    setActualStockInput('');

    // Move to next product or stay if no more
    if (currentIndex >= pendingProducts.length - 1) {
      setCurrentIndex(Math.max(0, pendingProducts.length - 2));
    }
  };

  // Navigate
  const goToNext = () => {
    if (currentIndex < pendingProducts.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setActualStockInput('');
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setActualStockInput('');
    }
  };

  // Remove from compared list
  const removeFromCompared = (index: number) => {
    setComparedProducts(prev => prev.filter((_, i) => i !== index));
  };

  // Edit compared product
  const editCompared = (index: number) => {
    setEditingIndex(index);
    setActualStockInput(comparedProducts[index].actualStock.toString());
  };

  // Save edit
  const saveEdit = () => {
    if (editingIndex === null) return;

    const actualStock = parseInt(actualStockInput) || 0;
    const item = comparedProducts[editingIndex];
    const difference = actualStock - item.systemStock;

    // Calculate loss
    const avgPurchasePrice = item.units.reduce((sum, u) => {
      return sum + (u.purchasePrice * u.stockQuantity);
    }, 0) / (item.systemStock || 1);

    const loss = difference < 0 ? Math.abs(difference) * avgPurchasePrice : 0;

    setComparedProducts(prev => prev.map((p, i) =>
      i === editingIndex
        ? { ...p, actualStock, difference, loss }
        : p
    ));

    setEditingIndex(null);
    setActualStockInput('');
  };

  // Reset
  const resetMatching = () => {
    setComparedProducts([]);
    setCurrentIndex(0);
    setActualStockInput('');
    setEditingIndex(null);
  };

  return (
    <>
      <Card className="shadow-sm border-0">
        <CardHeader className="bg-gradient-to-l from-blue-500 to-indigo-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-white" />
              <CardTitle className="text-base font-semibold text-white">الجرد</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            مقارنة مخزون المنتجات مع المخزون الفعلي وحساب الفروقات
          </p>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Products Preview */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4 max-h-40 overflow-y-auto">
                <p className="text-xs text-gray-500 mb-2">{products.length} منتج</p>
                <div className="space-y-1">
                  {products.slice(0, 5).map(product => (
                    <div key={product.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{product.name}</span>
                      <span className="text-gray-500">{formatStockDisplay(product.units)}</span>
                    </div>
                  ))}
                  {products.length > 5 && (
                    <p className="text-xs text-gray-400 text-center">
                      و {products.length - 5} منتج آخر...
                    </p>
                  )}
                </div>
              </div>

              <Button
                className="w-full h-11 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                onClick={startMatching}
                disabled={products.length === 0}
              >
                <ClipboardList className="h-4 w-4 ml-2" />
                بدء المطابقة
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Matching Dialog */}
      <Dialog open={showMatching} onOpenChange={setShowMatching}>
        <DialogContent className="max-w-2xl max-h-[95vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="bg-gradient-to-l from-blue-500 to-indigo-600 p-4 shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                مطابقة الجرد
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={resetMatching}
              >
                إعادة تعيين
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Compared Products Table */}
            {comparedProducts.length > 0 && (
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="bg-slate-700 text-white p-3">
                  <h3 className="font-semibold text-sm">المنتجات التي تمت مطابقتها ({comparedProducts.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="text-right p-2 font-medium">المنتج</th>
                        <th className="text-center p-2 font-medium">المخزون</th>
                        <th className="text-center p-2 font-medium">الفعلي</th>
                        <th className="text-center p-2 font-medium">الفارق</th>
                        <th className="text-center p-2 font-medium">الخسارة</th>
                        <th className="text-center p-2 font-medium w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparedProducts.map((item, index) => (
                        <tr key={item.productId} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{item.productName}</td>
                          <td className="p-2 text-center text-gray-600">
                            {formatPiecesToStock(item.systemStock, item.units)}
                          </td>
                          <td className="p-2 text-center text-gray-600">
                            {formatPiecesToStock(item.actualStock, item.units)}
                          </td>
                          <td className={`p-2 text-center font-semibold ${item.difference < 0 ? 'text-red-600' : item.difference > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                            {item.difference > 0 ? '+' : ''}{formatPiecesToStock(Math.abs(item.difference), item.units)}
                          </td>
                          <td className="p-2 text-center">
                            {item.loss > 0 ? (
                              <span className="text-red-600 font-semibold">
                                <CurrencyDisplay amount={item.loss} symbolSize={12} />
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => editCompared(index)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => removeFromCompared(index)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-red-50 border-t-2 border-red-200">
                        <td colSpan={4} className="p-3 text-left font-bold text-red-700">
                          إجمالي الخسارة
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-bold text-red-600 text-base">
                            <CurrencyDisplay amount={totalLoss} symbolSize={14} />
                          </span>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Current Product Card */}
            {editingIndex !== null ? (
              // Edit mode
              <Card className="border-2 border-blue-200 shadow-md">
                <CardHeader className="bg-blue-50 pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>تعديل: {comparedProducts[editingIndex]?.productName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setEditingIndex(null);
                        setActualStockInput('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <Label className="text-xs text-gray-500">المخزون في النظام</Label>
                      <p className="font-semibold mt-1">
                        {formatPiecesToStock(comparedProducts[editingIndex]?.systemStock || 0, comparedProducts[editingIndex]?.units || [])}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <Label className="text-xs text-blue-600">المخزون الفعلي</Label>
                      <Input
                        type="number"
                        value={actualStockInput}
                        onChange={(e) => setActualStockInput(e.target.value)}
                        className="mt-1 h-10"
                        placeholder="أدخل المخزون الفعلي"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 h-10 bg-blue-600 hover:bg-blue-700"
                      onClick={saveEdit}
                      disabled={!actualStockInput}
                    >
                      <Check className="h-4 w-4 ml-1" />
                      حفظ التعديل
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10"
                      onClick={() => {
                        setEditingIndex(null);
                        setActualStockInput('');
                      }}
                    >
                      إلغاء
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : currentProduct ? (
              // Normal comparison mode
              <Card className="border-2 border-teal-200 shadow-md">
                <CardHeader className="bg-teal-50 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{currentProduct.name}</CardTitle>
                      <p className="text-xs text-gray-500 mt-1">
                        المنتج {currentIndex + 1} من {pendingProducts.length}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={goToPrev}
                        disabled={currentIndex === 0}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={goToNext}
                        disabled={currentIndex >= pendingProducts.length - 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {/* Stock info */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">المخزون في النظام</span>
                    </div>
                    <p className="text-xl font-bold text-gray-800">
                      {formatStockDisplay(currentProduct.units)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      ({calculateTotalPieces(currentProduct.units)} قطعة)
                    </p>
                  </div>

                  {/* Actual stock input */}
                  <div className="mb-4">
                    <Label className="text-sm font-medium mb-2 block">المخزون الفعلي (قطع)</Label>
                    <Input
                      type="number"
                      value={actualStockInput}
                      onChange={(e) => setActualStockInput(e.target.value)}
                      placeholder="أدخل المخزون الفعلي بالقطع"
                      className="h-12 text-lg"
                    />
                  </div>

                  {/* Difference preview */}
                  {actualStockInput && (
                    <div className={`p-3 rounded-lg mb-4 ${
                      (parseInt(actualStockInput) || 0) < calculateTotalPieces(currentProduct.units)
                        ? 'bg-red-50 border border-red-200'
                        : (parseInt(actualStockInput) || 0) > calculateTotalPieces(currentProduct.units)
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">الفارق:</span>
                        <span className={`font-bold text-lg ${
                          (parseInt(actualStockInput) || 0) < calculateTotalPieces(currentProduct.units)
                            ? 'text-red-600'
                            : (parseInt(actualStockInput) || 0) > calculateTotalPieces(currentProduct.units)
                            ? 'text-green-600'
                            : 'text-gray-600'
                        }`}>
                          {(() => {
                            const diff = (parseInt(actualStockInput) || 0) - calculateTotalPieces(currentProduct.units);
                            if (diff < 0) {
                              return `ناقص ${formatPiecesToStock(Math.abs(diff), currentProduct.units)}`;
                            } else if (diff > 0) {
                              return `زائد ${formatPiecesToStock(diff, currentProduct.units)}`;
                            }
                            return 'لا يوجد فارق';
                          })()}
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full h-11 bg-teal-600 hover:bg-teal-700"
                    onClick={confirmProduct}
                    disabled={!actualStockInput}
                  >
                    <Check className="h-4 w-4 ml-2" />
                    تأكيد
                  </Button>
                </CardContent>
              </Card>
            ) : (
              // All products compared
              <Card className="border-2 border-green-200 bg-green-50">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-green-700 mb-2">تمت المطابقة!</h3>
                  <p className="text-sm text-green-600">
                    تمت مطابقة جميع المنتجات ({comparedProducts.length} منتج)
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-3 bg-gray-50 shrink-0">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowMatching(false)}
            >
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
