'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Loader2,
  Package,
  ChevronLeft,
  ChevronRight,
  Check,
  Box,
  Layers,
  CircleDot,
  AlertCircle,
  TrendingDown,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Product, ProductUnit } from '@/types';
import { CurrencyDisplay } from '@/components/ui/saudi-riyal-symbol';

// Get unit icon based on type
function getUnitIcon(unitType: string) {
  switch (unitType) {
    case 'carton':
      return <Box className="h-3 w-3" />;
    case 'packet':
      return <Layers className="h-3 w-3" />;
    case 'piece':
      return <CircleDot className="h-3 w-3" />;
    default:
      return <Package className="h-3 w-3" />;
  }
}

// Get unit color based on type
function getUnitColor(unitType: string) {
  switch (unitType) {
    case 'carton':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100' };
    case 'packet':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100' };
    case 'piece':
      return { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', badge: 'bg-violet-100' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', badge: 'bg-gray-100' };
  }
}

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

// Format pieces to all units display
function formatPiecesToStockFull(totalPieces: number, units: ProductUnit[]): { unitType: string; unitName: string; quantity: number }[] {
  if (totalPieces === 0) return [];

  const { cartons, packets, pieces } = convertPiecesToUnits(totalPieces, units);
  const result: { unitType: string; unitName: string; quantity: number }[] = [];

  const cartonUnit = units.find(u => u.unitType === 'carton');
  const packetUnit = units.find(u => u.unitType === 'packet');
  const pieceUnit = units.find(u => u.unitType === 'piece');

  if (cartonUnit && cartons > 0) {
    result.push({ unitType: 'carton', unitName: cartonUnit.unitName, quantity: cartons });
  }
  if (packetUnit && packets > 0) {
    result.push({ unitType: 'packet', unitName: 'باكت', quantity: packets });
  }
  if (pieceUnit && pieces > 0) {
    result.push({ unitType: 'piece', unitName: pieceUnit.unitName, quantity: pieces });
  }

  return result.length > 0 ? result : [{ unitType: 'piece', unitName: 'قطعة', quantity: 0 }];
}

interface ComparedProduct {
  productId: string;
  productName: string;
  systemStock: number;
  actualStock: number;
  difference: number;
  loss: number;
  units: ProductUnit[];
}

interface StockInput {
  cartons: string;
  packets: string;
  pieces: string;
}

interface InventoryMatchingProps {
  onBack: () => void;
}

export function InventoryMatching({ onBack }: InventoryMatchingProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Matching state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [comparedProducts, setComparedProducts] = useState<ComparedProduct[]>([]);
  const [stockInput, setStockInput] = useState<StockInput>({ cartons: '', packets: '', pieces: '' });

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

  // Calculate actual stock from inputs
  const calculateActualStock = (input: StockInput, units: ProductUnit[]): number => {
    const cartonUnit = units.find(u => u.unitType === 'carton');
    const packetUnit = units.find(u => u.unitType === 'packet');

    const cartons = parseInt(input.cartons) || 0;
    const packets = parseInt(input.packets) || 0;
    const pieces = parseInt(input.pieces) || 0;

    const cartonPieces = cartonUnit?.containsPieces || 0;
    const packetPieces = packetUnit?.containsPieces || 0;

    let total = pieces;
    if (packetUnit) {
      total += packets * packetPieces;
    }
    if (cartonUnit) {
      total += cartons * cartonPieces;
    }

    return total;
  };

  // Check if any input has value
  const hasInputValue = (input: StockInput): boolean => {
    return !!(input.cartons || input.packets || input.pieces);
  };

  // Confirm current product
  const confirmProduct = () => {
    if (!currentProduct) return;

    const actualStock = calculateActualStock(stockInput, currentProduct.units);
    const systemStock = calculateTotalPieces(currentProduct.units);

    if (!hasInputValue(stockInput)) {
      toast({ title: 'خطأ', description: 'أدخل المخزون الفعلي', variant: 'destructive' });
      return;
    }

    const difference = actualStock - systemStock;

    // Calculate loss
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
    setStockInput({ cartons: '', packets: '', pieces: '' });

    if (currentIndex >= pendingProducts.length - 1) {
      setCurrentIndex(Math.max(0, pendingProducts.length - 2));
    }
  };

  // Navigate
  const goToNext = () => {
    if (currentIndex < pendingProducts.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setStockInput({ cartons: '', packets: '', pieces: '' });
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setStockInput({ cartons: '', packets: '', pieces: '' });
    }
  };

  // Remove from compared list
  const removeFromCompared = (index: number) => {
    setComparedProducts(prev => prev.filter((_, i) => i !== index));
  };

  // Reset
  const resetMatching = () => {
    setComparedProducts([]);
    setCurrentIndex(0);
    setStockInput({ cartons: '', packets: '', pieces: '' });
  };

  // Get current difference
  const getCurrentDifference = () => {
    if (!currentProduct || !hasInputValue(stockInput)) return null;
    const actualStock = calculateActualStock(stockInput, currentProduct.units);
    const systemStock = calculateTotalPieces(currentProduct.units);
    return actualStock - systemStock;
  };

  const difference = getCurrentDifference();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Top Bar */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-slate-600 h-8 px-2"
            >
              <ChevronRight className="h-4 w-4 ml-0.5" />
              رجوع
            </Button>
            <div className="h-4 w-px bg-slate-200" />
            <span className="text-xs text-slate-500">
              {comparedProducts.length}/{products.length}
            </span>
          </div>
          {comparedProducts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetMatching}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2 gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              إعادة
            </Button>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Summary Cards - Small */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-lg border p-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Package className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[10px] text-slate-500">الكل</span>
            </div>
            <p className="text-base font-bold text-slate-800">{products.length}</p>
          </div>
          <div className="bg-white rounded-lg border p-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[10px] text-slate-500">تم</span>
            </div>
            <p className="text-base font-bold text-emerald-600">{comparedProducts.length}</p>
          </div>
          <div className="bg-white rounded-lg border p-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              <span className="text-[10px] text-slate-500">الخسارة</span>
            </div>
            <p className="text-sm font-bold text-red-600">
              <CurrencyDisplay amount={totalLoss} symbolSize={10} />
            </p>
          </div>
        </div>

        {/* Compared Products Table */}
        {comparedProducts.length > 0 && (
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="bg-slate-700 text-white px-3 py-1.5">
              <h2 className="font-medium text-xs">سجل المطابقة</h2>
            </div>
            <div className="overflow-x-auto max-h-36 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="border-b">
                    <th className="text-right p-1.5 font-medium text-slate-600">المنتج</th>
                    <th className="text-center p-1.5 font-medium text-slate-600">الفعلي</th>
                    <th className="text-center p-1.5 font-medium text-slate-600">الفارق</th>
                    <th className="text-center p-1.5 font-medium text-slate-600">الخسارة</th>
                    <th className="p-1.5 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {comparedProducts.map((item, index) => (
                    <tr key={item.productId} className="hover:bg-slate-50">
                      <td className="p-1.5 font-medium text-slate-800">{item.productName}</td>
                      <td className="p-1.5 text-center">
                        <div className="flex flex-wrap gap-0.5 justify-center">
                          {formatPiecesToStockFull(item.actualStock, item.units).map(u => (
                            <span key={u.unitType} className={`px-1 py-0.5 rounded ${getUnitColor(u.unitType).badge} ${getUnitColor(u.unitType).text}`}>
                              {u.quantity} {u.unitName}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-1.5 text-center">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-medium ${
                          item.difference < 0 
                            ? 'bg-red-100 text-red-700' 
                            : item.difference > 0 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.difference === 0 ? '0' : (
                            <>
                              {item.difference > 0 ? '+' : '-'}
                              {formatPiecesToStockFull(Math.abs(item.difference), item.units).map(u => `${u.quantity} ${u.unitName}`).join(' ')}
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-1.5 text-center">
                        {item.loss > 0 ? (
                          <span className="text-red-600 font-medium">
                            <CurrencyDisplay amount={item.loss} symbolSize={8} />
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-1.5">
                        <button
                          onClick={() => removeFromCompared(index)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <AlertCircle className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Current Product Card - Small & Compact */}
        {currentProduct ? (
          <Card className="border overflow-hidden">
            {/* Product Header - Compact */}
            <div className="bg-slate-700 text-white px-3 py-1.5 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-sm">{currentProduct.name}</h2>
                <p className="text-slate-300 text-[10px]">
                  {currentIndex + 1}/{pendingProducts.length}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrev}
                  disabled={currentIndex === 0}
                  className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNext}
                  disabled={currentIndex >= pendingProducts.length - 1}
                  className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <CardContent className="p-3 space-y-3">
              {/* System Stock - Compact */}
              <div>
                <h3 className="text-[10px] font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  المخزون في النظام
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {currentProduct.units
                    .filter(u => u.stockQuantity > 0)
                    .map(unit => {
                      const colors = getUnitColor(unit.unitType);
                      return (
                        <div
                          key={unit.id}
                          className={`${colors.bg} ${colors.border} border rounded px-2 py-1 flex items-center gap-1`}
                        >
                          <span className={colors.text}>{getUnitIcon(unit.unitType)}</span>
                          <span className={`font-semibold text-sm ${colors.text}`}>{unit.stockQuantity}</span>
                          <span className={`text-xs ${colors.text}`}>{unit.unitName}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Actual Stock Input - Compact */}
              <div>
                <Label className="text-[10px] font-medium text-slate-600 mb-1.5 block">
                  المخزون الفعلي
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {currentProduct.units.filter(u => u.unitType === 'carton').map(unit => (
                    <div key={unit.id} className={`${getUnitColor(unit.unitType).bg} ${getUnitColor(unit.unitType).border} border rounded-lg p-2`}>
                      <div className="flex items-center gap-1 mb-1">
                        <span className={getUnitColor(unit.unitType).text}>{getUnitIcon(unit.unitType)}</span>
                        <span className={`font-medium text-[10px] ${getUnitColor(unit.unitType).text}`}>{unit.unitName}</span>
                      </div>
                      <Input
                        type="number"
                        value={stockInput.cartons}
                        onChange={(e) => setStockInput(prev => ({ ...prev, cartons: e.target.value }))}
                        placeholder="0"
                        className="h-8 text-center text-sm font-medium border bg-white"
                        min="0"
                      />
                    </div>
                  ))}
                  {currentProduct.units.filter(u => u.unitType === 'packet').map(unit => (
                    <div key={unit.id} className={`${getUnitColor(unit.unitType).bg} ${getUnitColor(unit.unitType).border} border rounded-lg p-2`}>
                      <div className="flex items-center gap-1 mb-1">
                        <span className={getUnitColor(unit.unitType).text}>{getUnitIcon(unit.unitType)}</span>
                        <span className={`font-medium text-[10px] ${getUnitColor(unit.unitType).text}`}>{unit.unitName}</span>
                      </div>
                      <Input
                        type="number"
                        value={stockInput.packets}
                        onChange={(e) => setStockInput(prev => ({ ...prev, packets: e.target.value }))}
                        placeholder="0"
                        className="h-8 text-center text-sm font-medium border bg-white"
                        min="0"
                      />
                    </div>
                  ))}
                  {currentProduct.units.filter(u => u.unitType === 'piece').map(unit => (
                    <div key={unit.id} className={`${getUnitColor(unit.unitType).bg} ${getUnitColor(unit.unitType).border} border rounded-lg p-2`}>
                      <div className="flex items-center gap-1 mb-1">
                        <span className={getUnitColor(unit.unitType).text}>{getUnitIcon(unit.unitType)}</span>
                        <span className={`font-medium text-[10px] ${getUnitColor(unit.unitType).text}`}>{unit.unitName}</span>
                      </div>
                      <Input
                        type="number"
                        value={stockInput.pieces}
                        onChange={(e) => setStockInput(prev => ({ ...prev, pieces: e.target.value }))}
                        placeholder="0"
                        className="h-8 text-center text-sm font-medium border bg-white"
                        min="0"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Difference Preview - Compact */}
              {hasInputValue(stockInput) && difference !== null && (
                <div className={`rounded-lg p-2 ${
                  difference < 0 
                    ? 'bg-red-50 border border-red-200' 
                    : difference > 0 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-slate-50 border border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">الفارق:</span>
                    <span className={`text-sm font-bold ${
                      difference < 0 ? 'text-red-600' : difference > 0 ? 'text-green-600' : 'text-slate-600'
                    }`}>
                      {difference === 0 ? (
                        'لا يوجد فارق'
                      ) : (
                        <>
                          {difference < 0 ? 'ناقص ' : 'زائد '}
                          {formatPiecesToStockFull(Math.abs(difference), currentProduct.units).map(u => `${u.quantity} ${u.unitName}`).join('، ')}
                        </>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Confirm Button */}
              <Button
                size="sm"
                onClick={confirmProduct}
                disabled={!hasInputValue(stockInput)}
                className="w-full h-9 bg-slate-700 hover:bg-slate-800 gap-1.5"
              >
                <Check className="h-4 w-4" />
                تأكيد
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-emerald-200 bg-emerald-50">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="font-bold text-emerald-700 mb-1">تمت المطابقة!</h3>
              <p className="text-xs text-emerald-600 mb-3">
                {comparedProducts.length} منتج
              </p>
              {totalLoss > 0 && (
                <div className="bg-white rounded-lg p-2 inline-block">
                  <p className="text-[10px] text-slate-500">إجمالي الخسارة</p>
                  <p className="text-lg font-bold text-red-600">
                    <CurrencyDisplay amount={totalLoss} symbolSize={14} />
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
