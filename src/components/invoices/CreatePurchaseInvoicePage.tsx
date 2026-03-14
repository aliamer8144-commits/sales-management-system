'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Plus,
  Trash2,
  Search,
  Package,
  Hash,
  X,
  Box,
  Layers,
  CircleDot,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';
import type { Product, ProductUnit } from '@/types';
import { CurrencyDisplay } from '@/components/ui/saudi-riyal-symbol';

// Generate unique invoice number
const generateInvoiceNumber = () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.getTime().toString().slice(-6);
  return `PUR-${dateStr}-${timeStr}`;
};

// Format date
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

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

interface PurchaseItem {
  productId: string;
  productName: string;
  productUnitId: string;
  unitName: string;
  unitType: string;
  quantity: number;
  purchasePrice: number;
  currentStock: number;
}

export function CreatePurchaseInvoicePage() {
  const user = useAuthStore((state) => state.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invoice data
  const [invoiceNumber] = useState(generateInvoiceNumber());
  const [invoiceDate] = useState(new Date());
  const [selectedItems, setSelectedItems] = useState<PurchaseItem[]>([]);
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // UI states
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch data
  useEffect(() => {
    fetch('/api/products').then((r) => r.json()).then((data) => {
      setProducts(Array.isArray(data) ? data : []);
    });
  }, []);

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  // Calculate total
  const total = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0);
  }, [selectedItems]);

  // Add item to invoice
  const handleAddItem = (product: Product, unitId: string, quantity: number, purchasePrice: number) => {
    const unit = product.units.find((u) => u.id === unitId);
    if (!unit) return;

    if (quantity <= 0) {
      toast({ title: 'خطأ', description: 'أدخل الكمية', variant: 'destructive' });
      return;
    }

    if (purchasePrice <= 0) {
      toast({ title: 'خطأ', description: 'أدخل سعر الشراء', variant: 'destructive' });
      return;
    }

    // Check if item already exists with same unit
    const existingIndex = selectedItems.findIndex(
      (item) => item.productId === product.id && item.productUnitId === unitId
    );

    if (existingIndex >= 0) {
      // Update quantity
      const updatedItems = [...selectedItems];
      updatedItems[existingIndex].quantity += quantity;
      setSelectedItems(updatedItems);
    } else {
      // Add new item
      const totalPieces = calculateTotalPieces(product.units);
      setSelectedItems([
        ...selectedItems,
        {
          productId: product.id,
          productName: product.name,
          productUnitId: unit.id!,
          unitName: unit.unitName,
          unitType: unit.unitType,
          quantity,
          purchasePrice,
          currentStock: totalPieces,
        },
      ]);
    }

    setShowProductSearch(false);
    setSearchQuery('');
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  // Clear invoice
  const handleClearInvoice = () => {
    setSelectedItems([]);
    setInvoiceNotes('');
  };

  // Submit invoice
  const handleSubmit = async () => {
    if (!user?.id) {
      toast({ title: 'خطأ', description: 'يجب تسجيل الدخول أولاً', variant: 'destructive' });
      return;
    }
    if (selectedItems.length === 0) {
      toast({ title: 'خطأ', description: 'أضف منتج واحد على الأقل', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/purchase-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          notes: invoiceNotes,
          items: selectedItems.map((item) => ({
            productId: item.productId,
            productUnitId: item.productUnitId,
            quantity: item.quantity,
            purchasePrice: item.purchasePrice,
          })),
        }),
      });
      if (response.ok) {
        toast({ title: 'تم بنجاح', description: 'تم إنشاء فاتورة المشتريات وإضافة المخزون' });
        handleClearInvoice();
        // Refresh products to get updated stock
        const productsData = await fetch('/api/products').then((r) => r.json());
        setProducts(Array.isArray(productsData) ? productsData : []);
      } else {
        const error = await response.json();
        toast({ title: 'خطأ', description: error.error, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Invoice Header */}
      <div className="bg-white border-b">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Hash className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">رقم فاتورة المشتريات</p>
              <p className="font-bold text-gray-800">{invoiceNumber}</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-sm text-gray-600">{formatDate(invoiceDate)}</p>
          </div>
        </div>
      </div>

      {/* Invoice Table - Professional Data Grid View */}
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {/* Data Grid Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              {/* Table Header */}
              <thead>
                <tr className="bg-amber-700 text-white">
                  <th className="text-right font-bold border-l border-amber-600">المنتج</th>
                  <th className="text-center font-bold border-l border-amber-600">الوحدة</th>
                  <th className="text-center font-bold border-l border-amber-600">الكمية</th>
                  <th className="text-center font-bold border-l border-amber-600">سعر الشراء</th>
                  <th className="text-center font-bold border-l border-amber-600">الإجمالي</th>
                  <th className="text-center w-6"></th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {selectedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center">
                      <Package className="h-6 w-6 mx-auto mb-1 text-gray-300" />
                      <p className="text-xs text-gray-400">لم يتم إضافة منتجات بعد</p>
                      <p className="text-xs text-gray-300 mt-1">اضغط على "إضافة منتج" للبدء</p>
                    </td>
                  </tr>
                ) : (
                  selectedItems.map((item, index) => (
                    <tr
                      key={`${item.productId}-${item.productUnitId}`}
                      className="border-b border-gray-200 hover:bg-slate-50 transition-colors"
                    >
                      {/* Product Name */}
                      <td className="border-l border-gray-200">
                        <span className="font-medium text-gray-800">{item.productName}</span>
                      </td>

                      {/* Unit */}
                      <td className="text-center border-l border-gray-200">
                        <span className="text-gray-600">{item.unitName}</span>
                      </td>

                      {/* Quantity */}
                      <td className="text-center border-l border-gray-200">
                        <span className="font-semibold text-gray-800">{item.quantity}</span>
                      </td>

                      {/* Purchase Price */}
                      <td className="text-center border-l border-gray-200">
                        <span className="text-gray-800">{item.purchasePrice.toLocaleString()}</span>
                      </td>

                      {/* Total */}
                      <td className="text-center border-l border-gray-200">
                        <span className="font-bold text-amber-600">{(item.quantity * item.purchasePrice).toLocaleString()}</span>
                      </td>

                      {/* Delete */}
                      <td className="text-center">
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add Product Row */}
          <div className="border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setShowProductSearch(true)}
              className="w-full py-0.5 border border-dashed border-amber-300 text-amber-600 hover:border-amber-500 hover:bg-amber-50 transition-all flex items-center justify-center gap-1"
            >
              <Plus className="h-3 w-3" />
              <span className="text-xs">إضافة منتج</span>
            </button>
          </div>

          {/* Table Footer - Total */}
          {selectedItems.length > 0 && (
            <div className="border-t border-amber-300 bg-amber-50">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-amber-700">الإجمالي</span>
                <span className="text-sm font-bold text-amber-600"><CurrencyDisplay amount={total} symbolSize={14} /></span>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="mt-4 bg-white rounded-lg shadow-sm border p-4">
          <Label className="text-sm text-gray-600 mb-2 block">ملاحظات</Label>
          <Textarea
            placeholder="أضف ملاحظات للفاتورة (اختياري)..."
            value={invoiceNotes}
            onChange={(e) => setInvoiceNotes(e.target.value)}
            className="resize-none border-gray-200"
            rows={2}
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-12 border-red-200 text-red-600 hover:bg-red-50"
            onClick={handleClearInvoice}
            disabled={selectedItems.length === 0}
          >
            <Trash2 className="h-4 w-4 ml-2" />
            إلغاء
          </Button>
          <Button
            className="h-12 bg-amber-600 hover:bg-amber-700"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedItems.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              'حفظ فاتورة المشتريات'
            )}
          </Button>
        </div>
      </div>

      {/* Product Search Dialog */}
      <Dialog open={showProductSearch} onOpenChange={setShowProductSearch}>
        <DialogContent className="max-w-2xl p-0 gap-0 max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="p-4 border-b bg-amber-600 text-white shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              إضافة منتج للمشتريات
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 shrink-0 border-b">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder="البحث عن منتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 h-12 text-base"
                autoFocus
              />
            </div>
          </div>

          {/* Products Table Header */}
          <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 border-b text-xs font-semibold text-gray-600 shrink-0">
            <div className="col-span-4">المنتج</div>
            <div className="col-span-3 text-center">المخزون</div>
            <div className="col-span-3 text-center">الوحدة</div>
            <div className="col-span-2"></div>
          </div>

          {/* Products Table Body */}
          <div className="flex-1 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Package className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p>لا توجد منتجات</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredProducts.map((product) => (
                  <ProductSearchRow
                    key={product.id}
                    product={product}
                    onAdd={handleAddItem}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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

// Product Search Row Component - Professional Unit Selector
function ProductSearchRow({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (product: Product, unitId: string, quantity: number, purchasePrice: number) => void;
}) {
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [expanded, setExpanded] = useState(false);

  const totalPieces = calculateTotalPieces(product.units);

  // Get all available units
  const availableUnits = product.units;

  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);
    setQuantity('');
    const unit = product.units.find(u => u.id === unitId);
    if (unit) {
      setPurchasePrice(unit.purchasePrice?.toString() || '');
    }
    setExpanded(true);
  };

  const handleAdd = () => {
    if (!selectedUnitId || !quantity || !purchasePrice) return;
    const qty = parseInt(quantity);
    const price = parseFloat(purchasePrice);
    if (qty <= 0 || price <= 0) return;
    
    onAdd(product, selectedUnitId, qty, price);
    setSelectedUnitId('');
    setQuantity('');
    setPurchasePrice('');
    setExpanded(false);
  };

  const selectedUnit = selectedUnitId ? product.units.find((u) => u.id === selectedUnitId) : null;

  return (
    <div className="hover:bg-gray-50 transition-colors">
      {/* Main Row */}
      <div className="grid grid-cols-12 gap-2 p-3 items-center">
        {/* Product Name */}
        <div className="col-span-4">
          <p className="font-medium text-gray-800 text-sm truncate">{product.name}</p>
        </div>

        {/* Stock Display */}
        <div className="col-span-3 text-center">
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md">
            <Package className="h-3 w-3 text-slate-500" />
            <span className="text-xs text-slate-600 font-medium">{formatStockDisplay(product.units)}</span>
          </div>
        </div>

        {/* Unit Selector - Professional Dropdown */}
        <div className="col-span-3">
          <Select value={selectedUnitId} onValueChange={handleUnitChange}>
            <SelectTrigger 
              className="w-full h-9 text-sm border-slate-200 hover:border-amber-400 focus:ring-amber-500 focus:border-amber-500 data-[state=open]:border-amber-500 data-[state=open]:ring-2 data-[state=open]:ring-amber-100"
            >
              <SelectValue placeholder="اختر وحدة" />
            </SelectTrigger>
            <SelectContent 
              className="min-w-[140px] border-slate-200 shadow-lg rounded-lg overflow-hidden"
              position="popper"
              sideOffset={4}
            >
              {availableUnits.map((unit) => (
                <SelectItem
                  key={unit.id}
                  value={unit.id!}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-amber-50 focus:bg-amber-50 focus:text-amber-700 transition-colors"
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-amber-600">{getUnitIcon(unit.unitType)}</span>
                    <span className="font-medium">{unit.unitName}</span>
                    <span className="text-xs text-gray-400 mr-auto">
                      ({unit.stockQuantity} متاح)
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Add Button */}
        <div className="col-span-2 flex justify-center">
          {selectedUnitId && quantity && purchasePrice && parseInt(quantity) > 0 && parseFloat(purchasePrice) > 0 ? (
            <button
              onClick={handleAdd}
              className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 active:scale-95 transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : (
            <span className="p-2 bg-gray-100 text-gray-300 rounded-lg">
              <Plus className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>

      {/* Expanded Input Fields */}
      {expanded && selectedUnitId && selectedUnit && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100 bg-gradient-to-b from-amber-50/50 to-white">
          <div className="flex items-center gap-4 pt-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-500 font-medium">الكمية:</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="w-20 h-8 text-sm text-center border-slate-200 focus:border-amber-500 focus:ring-amber-100"
                min="1"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-500 font-medium">سعر الشراء:</Label>
              <Input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
                className="w-24 h-8 text-sm border-slate-200 focus:border-amber-500 focus:ring-amber-100"
                step="0.01"
              />
            </div>

            {quantity && purchasePrice && parseInt(quantity) > 0 && parseFloat(purchasePrice) > 0 && (
              <div className="text-sm font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-md">
                = {(parseInt(quantity) * parseFloat(purchasePrice)).toLocaleString()} ﷼
              </div>
            )}

            <button
              onClick={() => {
                setExpanded(false);
                setSelectedUnitId('');
                setQuantity('');
                setPurchasePrice('');
              }}
              className="mr-auto p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
