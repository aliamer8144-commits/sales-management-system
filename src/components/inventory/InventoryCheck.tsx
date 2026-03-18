'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  ArrowRight,
  Box,
  Layers,
  CircleDot,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Product, ProductUnit } from '@/types';
import { CurrencyDisplay } from '@/components/ui/saudi-riyal-symbol';

// Get unit icon based on type
function getUnitIcon(unitType: string) {
  switch (unitType) {
    case 'carton':
      return <Box className="h-3.5 w-3.5" />;
    case 'packet':
      return <Layers className="h-3.5 w-3.5" />;
    case 'piece':
      return <CircleDot className="h-3.5 w-3.5" />;
    default:
      return <Package className="h-3.5 w-3.5" />;
  }
}

// Get unit color based on type
function getUnitColor(unitType: string) {
  switch (unitType) {
    case 'carton':
      return 'bg-teal-100 text-teal-700 border-teal-200';
    case 'packet':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'piece':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
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

// Format stock display with all units
function formatStockDisplayFull(units: ProductUnit[]): { unitType: string; unitName: string; quantity: number }[] {
  return units
    .filter(u => u.stockQuantity > 0)
    .map(u => ({
      unitType: u.unitType,
      unitName: u.unitName,
      quantity: u.stockQuantity,
    }));
}

// Format pieces to all units display
function formatPiecesToStockFull(totalPieces: number, units: ProductUnit[]): { unitType: string; unitName: string; quantity: number }[] {
  const { cartons, packets, pieces } = convertPiecesToUnits(totalPieces, units);
  const result: { unitType: string; unitName: string; quantity: number }[] = [];

  const cartonUnit = units.find(u => u.unitType === 'carton');
  const packetUnit = units.find(u => u.unitType === 'packet');
  const pieceUnit = units.find(u => u.unitType === 'piece');

  if (cartonUnit && cartons > 0) {
    result.push({ unitType: 'carton', unitName: cartonUnit.unitName, quantity: cartons });
  }
  if (packetUnit && packets > 0) {
    result.push({ unitType: 'packet', unitName: packetUnit.unitName, quantity: packets });
  }
  if (pieceUnit && pieces > 0) {
    result.push({ unitType: 'piece', unitName: pieceUnit.unitName, quantity: pieces });
  }

  return result;
}

interface ComparedProduct {
  productId: string;
  productName: string;
  systemStock: number; // in pieces
  actualStock: number; // in pieces
  difference: number; // in pieces
  loss: number; // in money
  units: ProductUnit[];
}

interface StockInput {
  cartons: string;
  packets: string;
  pieces: string;
}

export function InventoryCheck() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMatching, setShowMatching] = useState(false);

  // Matching state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [comparedProducts, setComparedProducts] = useState<ComparedProduct[]>([]);
  const [stockInput, setStockInput] = useState<StockInput>({ cartons: '', packets: '', pieces: '' });
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
    setStockInput({ cartons: '', packets: '', pieces: '' });
  };

  // Calculate actual stock from inputs
  const calculateActualStock = (input: StockInput, units: ProductUnit[]): number => {
    const cartonUnit = units.find(u => u.unitType === 'carton');
    const packetUnit = units.find(u => u.unitType === 'packet');

    const cartons = parseInt(input.cartons) || 0;
    const packets = parseInt(input.packets) || 0;
    const pieces = parseInt(input.pieces) || 0;

    const cartonPieces = cartonUnit?.containsPieces || 0;
    const packetPieces = packetUnit?.containsPieces || 0;

    // Calculate total pieces
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
    const difference = actualStock - systemStock;

    if (!hasInputValue(stockInput)) {
      toast({ title: 'خطأ', description: 'أدخل المخزون الفعلي', variant: 'destructive' });
      return;
    }

    // Calculate loss (only if negative difference - missing stock)
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

    // Move to next product
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

  // Edit compared product
  const editCompared = (index: number) => {
    setEditingIndex(index);
    const item = comparedProducts[index];
    const { cartons, packets, pieces } = convertPiecesToUnits(item.actualStock, item.units);
    setStockInput({
      cartons: cartons.toString(),
      packets: packets.toString(),
      pieces: pieces.toString(),
    });
  };

  // Save edit
  const saveEdit = () => {
    if (editingIndex === null) return;

    const item = comparedProducts[editingIndex];
    const actualStock = calculateActualStock(stockInput, item.units);
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
    setStockInput({ cartons: '', packets: '', pieces: '' });
  };

  // Reset
  const resetMatching = () => {
    setComparedProducts([]);
    setCurrentIndex(0);
    setStockInput({ cartons: '', packets: '', pieces: '' });
    setEditingIndex(null);
  };

  // Render stock input for a unit
  const renderStockInput = (unit: ProductUnit, value: string, onChange: (v: string) => void) => (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${getUnitColor(unit.unitType)}`}>
        {getUnitIcon(unit.unitType)}
        <span className="text-sm font-medium">{unit.unitName}</span>
      </div>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-20 h-10 text-center"
        min="0"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">الجرد</h1>
            <p className="text-sm text-gray-500">مقارنة المخزون الفعلي مع المخزون في النظام</p>
          </div>
          <Button
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            onClick={startMatching}
            disabled={isLoading || products.length === 0}
          >
            <ClipboardList className="h-4 w-4 ml-2" />
            بدء المطابقة
          </Button>
        </div>
      </div>

      {/* Products List */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">لا توجد منتجات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product, idx) => (
              <Card key={product.id} className="shadow-sm overflow-hidden">
                <div className="flex items-center">
                  {/* Index */}
                  <div className="w-12 h-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm">
                    {idx + 1}
                  </div>
                  {/* Content */}
                  <CardContent className="flex-1 p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">{product.name}</h3>
                    <div className="flex flex-wrap gap-2">
                      {product.units
                        .filter(u => u.stockQuantity > 0)
                        .map((unit) => (
                          <Badge
                            key={unit.id}
                            variant="outline"
                            className={`${getUnitColor(unit.unitType)} gap-1`}
                          >
                            {getUnitIcon(unit.unitType)}
                            <span>{unit.quantity || unit.stockQuantity} {unit.unitName}</span>
                          </Badge>
                        ))}
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

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
                          <td className="p-2 text-center">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {formatPiecesToStockFull(item.systemStock, item.units).map(u => (
                                <span key={u.unitType} className={`text-xs px-1.5 py-0.5 rounded ${getUnitColor(u.unitType)}`}>
                                  {u.quantity} {u.unitName}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {formatPiecesToStockFull(item.actualStock, item.units).map(u => (
                                <span key={u.unitType} className={`text-xs px-1.5 py-0.5 rounded ${getUnitColor(u.unitType)}`}>
                                  {u.quantity} {u.unitName}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className={`p-2 text-center font-semibold ${item.difference < 0 ? 'text-red-600' : item.difference > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                            {item.difference === 0 ? '0' : (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {formatPiecesToStockFull(Math.abs(item.difference), item.units).map(u => (
                                  <span key={u.unitType}>
                                    {u.quantity} {u.unitName}
                                  </span>
                                ))}
                                <span>{item.difference > 0 ? '+' : '-'}</span>
                              </div>
                            )}
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
                        setStockInput({ cartons: '', packets: '', pieces: '' });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {/* System Stock */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <Label className="text-xs text-gray-500">المخزون في النظام</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {formatPiecesToStockFull(
                        comparedProducts[editingIndex]?.systemStock || 0,
                        comparedProducts[editingIndex]?.units || []
                      ).map(u => (
                        <Badge key={u.unitType} className={getUnitColor(u.unitType)}>
                          {u.quantity} {u.unitName}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actual Stock Input */}
                  <div className="mb-4">
                    <Label className="text-sm font-medium mb-3 block">المخزون الفعلي</Label>
                    <div className="flex flex-wrap gap-3">
                      {comparedProducts[editingIndex]?.units
                        .filter(u => u.unitType === 'carton')
                        .map(unit => renderStockInput(unit, stockInput.cartons, (v) =>
                          setStockInput(prev => ({ ...prev, cartons: v }))
                        ))}
                      {comparedProducts[editingIndex]?.units
                        .filter(u => u.unitType === 'packet')
                        .map(unit => renderStockInput(unit, stockInput.packets, (v) =>
                          setStockInput(prev => ({ ...prev, packets: v }))
                        ))}
                      {comparedProducts[editingIndex]?.units
                        .filter(u => u.unitType === 'piece')
                        .map(unit => renderStockInput(unit, stockInput.pieces, (v) =>
                          setStockInput(prev => ({ ...prev, pieces: v }))
                        ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 h-10 bg-blue-600 hover:bg-blue-700"
                      onClick={saveEdit}
                      disabled={!hasInputValue(stockInput)}
                    >
                      <Check className="h-4 w-4 ml-1" />
                      حفظ التعديل
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10"
                      onClick={() => {
                        setEditingIndex(null);
                        setStockInput({ cartons: '', packets: '', pieces: '' });
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
                  {/* System Stock */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">المخزون في النظام</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentProduct.units
                        .filter(u => u.stockQuantity > 0)
                        .map(unit => (
                          <Badge key={unit.id} className={getUnitColor(unit.unitType)}>
                            {getUnitIcon(unit.unitType)}
                            <span className="mr-1">{unit.stockQuantity} {unit.unitName}</span>
                          </Badge>
                        ))}
                    </div>
                  </div>

                  {/* Actual Stock Input */}
                  <div className="mb-4">
                    <Label className="text-sm font-medium mb-3 block">المخزون الفعلي</Label>
                    <div className="flex flex-wrap gap-3">
                      {currentProduct.units
                        .filter(u => u.unitType === 'carton')
                        .map(unit => renderStockInput(unit, stockInput.cartons, (v) =>
                          setStockInput(prev => ({ ...prev, cartons: v }))
                        ))}
                      {currentProduct.units
                        .filter(u => u.unitType === 'packet')
                        .map(unit => renderStockInput(unit, stockInput.packets, (v) =>
                          setStockInput(prev => ({ ...prev, packets: v }))
                        ))}
                      {currentProduct.units
                        .filter(u => u.unitType === 'piece')
                        .map(unit => renderStockInput(unit, stockInput.pieces, (v) =>
                          setStockInput(prev => ({ ...prev, pieces: v }))
                        ))}
                    </div>
                  </div>

                  {/* Difference Preview */}
                  {hasInputValue(stockInput) && (
                    <div className={`p-3 rounded-lg mb-4 ${
                      calculateActualStock(stockInput, currentProduct.units) < calculateTotalPieces(currentProduct.units)
                        ? 'bg-red-50 border border-red-200'
                        : calculateActualStock(stockInput, currentProduct.units) > calculateTotalPieces(currentProduct.units)
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">الفارق:</span>
                        <span className={`font-bold text-lg ${
                          calculateActualStock(stockInput, currentProduct.units) < calculateTotalPieces(currentProduct.units)
                            ? 'text-red-600'
                            : calculateActualStock(stockInput, currentProduct.units) > calculateTotalPieces(currentProduct.units)
                            ? 'text-green-600'
                            : 'text-gray-600'
                        }`}>
                          {(() => {
                            const diff = calculateActualStock(stockInput, currentProduct.units) - calculateTotalPieces(currentProduct.units);
                            if (diff === 0) return 'لا يوجد فارق';
                            const diffUnits = formatPiecesToStockFull(Math.abs(diff), currentProduct.units);
                            if (diffUnits.length === 0) return 'لا يوجد فارق';
                            return (
                              <span>
                                {diff < 0 ? 'ناقص ' : 'زائد '}
                                {diffUnits.map(u => `${u.quantity} ${u.unitName}`).join('، ')}
                              </span>
                            );
                          })()}
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full h-11 bg-teal-600 hover:bg-teal-700"
                    onClick={confirmProduct}
                    disabled={!hasInputValue(stockInput)}
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
    </div>
  );
}
