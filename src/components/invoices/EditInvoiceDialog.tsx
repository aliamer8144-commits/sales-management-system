'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Loader2,
  Plus,
  Trash2,
  Search,
  Package,
  X,
  Box,
  Layers,
  CircleDot,
  Check,
  ChevronDown,
  User,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Product, Customer, ProductUnit } from '@/types';
import { CurrencyDisplay } from '@/components/ui/saudi-riyal-symbol';

interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  productUnitId: string;
  unitName: string;
  unitType: string;
  quantity: number;
  salePrice: number;
  purchasePrice: number;
}

interface EditInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string | null;
  onSuccess: () => void;
}

interface EditInvoiceFormItem {
  productId: string;
  productName: string;
  productUnitId: string;
  unitName: string;
  unitType: string;
  quantity: number;
  salePrice: number;
  purchasePrice: number;
}

// Calculate total pieces from units
function calculateTotalPieces(units: ProductUnit[]): number {
  return units.reduce((total, unit) => {
    return total + (unit.stockQuantity * unit.containsPieces);
  }, 0);
}

// Format stock display
function formatStockDisplay(units: ProductUnit[]): string {
  const totalPieces = calculateTotalPieces(units);
  
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
  
  const parts: string[] = [];
  if (cartons > 0) parts.push(`${cartons} كرتون`);
  if (packets > 0) parts.push(`${packets} باكت`);
  if (pieces > 0) parts.push(`${pieces} قطعة`);
  
  return parts.length > 0 ? parts.join('، ') : '0';
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

export function EditInvoiceDialog({ open, onOpenChange, invoiceId, onSuccess }: EditInvoiceDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Invoice data
  const [invoiceType, setInvoiceType] = useState<'cash' | 'credit'>('cash');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<EditInvoiceFormItem[]>([]);
  
  // UI states
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Load invoice data
  useEffect(() => {
    if (open && invoiceId) {
      setIsLoading(true);
      
      Promise.all([
        fetch('/api/products').then((r) => r.json()),
        fetch('/api/customers').then((r) => r.json()),
        fetch(`/api/invoices/${invoiceId}`).then((r) => r.json()),
      ]).then(([productsData, customersData, invoiceData]) => {
        setProducts(Array.isArray(productsData) ? productsData : []);
        setCustomers(Array.isArray(customersData) ? customersData : []);
        
        if (invoiceData && !invoiceData.error) {
          setInvoiceType(invoiceData.invoiceType || 'cash');
          setInvoiceNotes(invoiceData.notes || '');
          
          if (invoiceData.customerId && invoiceData.customer) {
            setSelectedCustomer({
              id: invoiceData.customerId,
              name: invoiceData.customer.name,
              phone: '',
            });
          } else {
            setSelectedCustomer(null);
          }
          
          if (invoiceData.items) {
            setSelectedItems(invoiceData.items.map((item: InvoiceItem) => ({
              productId: item.productId,
              productName: item.productName,
              productUnitId: item.productUnitId,
              unitName: item.unitName,
              unitType: item.unitType,
              quantity: item.quantity,
              salePrice: item.salePrice,
              purchasePrice: item.purchasePrice,
            })));
          }
        }
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [open, invoiceId]);
  
  // Filter products
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);
  
  // Calculate total
  const total = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.quantity * item.salePrice, 0);
  }, [selectedItems]);
  
  // Add item to invoice
  const handleAddItem = (product: Product, unitId: string, quantity: number, salePrice: number) => {
    const unit = product.units.find((u) => u.id === unitId);
    if (!unit) return;

    if (quantity <= 0) {
      toast({ title: 'خطأ', description: 'أدخل الكمية', variant: 'destructive' });
      return;
    }

    if (salePrice <= 0) {
      toast({ title: 'خطأ', description: 'أدخل سعر البيع', variant: 'destructive' });
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
      setSelectedItems([
        ...selectedItems,
        {
          productId: product.id,
          productName: product.name,
          productUnitId: unit.id!,
          unitName: unit.unitName,
          unitType: unit.unitType,
          quantity,
          salePrice,
          purchasePrice: unit.purchasePrice,
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

  // Submit
  const handleSubmit = async () => {
    if (!invoiceId) return;
    
    if (selectedItems.length === 0) {
      toast({ title: 'خطأ', description: 'أضف منتج واحد على الأقل', variant: 'destructive' });
      return;
    }
    if (invoiceType === 'credit' && !selectedCustomer) {
      toast({ title: 'خطأ', description: 'اختر عميل للفاتورة الآجلة', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer?.id,
          invoiceType,
          notes: invoiceNotes,
          items: selectedItems.map((item) => ({
            productId: item.productId,
            productUnitId: item.productUnitId,
            quantity: item.quantity,
            salePrice: item.salePrice,
          })),
        }),
      });
      if (response.ok) {
        toast({ title: 'تم بنجاح', description: 'تم تعديل الفاتورة' });
        onOpenChange(false);
        onSuccess();
      } else {
        const error = await response.json();
        toast({ title: 'خطأ', description: error.error, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-teal-600" />
            تعديل الفاتورة
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            {/* Invoice Items Table */}
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-700 text-white">
                      <th className="text-right font-bold border-l border-slate-600 p-2">المنتج</th>
                      <th className="text-center font-bold border-l border-slate-600 p-2">الوحدة</th>
                      <th className="text-center font-bold border-l border-slate-600 p-2">الكمية</th>
                      <th className="text-center font-bold border-l border-slate-600 p-2">السعر</th>
                      <th className="text-center font-bold border-l border-slate-600 p-2">الإجمالي</th>
                      <th className="text-center w-6 p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center">
                          <p className="text-xs text-gray-400">لم يتم إضافة منتجات</p>
                        </td>
                      </tr>
                    ) : (
                      selectedItems.map((item, index) => (
                        <tr key={`${item.productId}-${item.productUnitId}`} className="border-b border-gray-200">
                          <td className="border-l border-gray-200 p-2">
                            <span className="font-medium text-gray-800">{item.productName}</span>
                          </td>
                          <td className="text-center border-l border-gray-200 p-2">
                            <span className="text-gray-600">{item.unitName}</span>
                          </td>
                          <td className="text-center border-l border-gray-200 p-2">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQuantity = parseInt(e.target.value) || 0;
                                if (newQuantity <= 0) {
                                  handleRemoveItem(index);
                                } else {
                                  const updatedItems = [...selectedItems];
                                  updatedItems[index].quantity = newQuantity;
                                  setSelectedItems(updatedItems);
                                }
                              }}
                              className="w-16 h-8 text-center mx-auto"
                              min="1"
                            />
                          </td>
                          <td className="text-center border-l border-gray-200 p-2">
                            <Input
                              type="number"
                              value={item.salePrice}
                              onChange={(e) => {
                                const newPrice = parseFloat(e.target.value) || 0;
                                const updatedItems = [...selectedItems];
                                updatedItems[index].salePrice = newPrice;
                                setSelectedItems(updatedItems);
                              }}
                              className="w-20 h-8 text-center mx-auto"
                              step="0.01"
                            />
                          </td>
                          <td className="text-center border-l border-gray-200 p-2">
                            <span className="font-bold text-teal-600">
                              <CurrencyDisplay amount={item.quantity * item.salePrice} symbolSize={10} />
                            </span>
                          </td>
                          <td className="text-center p-2">
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
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
                  className="w-full py-2 border border-dashed border-slate-300 text-slate-500 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50 transition-all flex items-center justify-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-xs">إضافة منتج</span>
                </button>
              </div>
              
              {/* Total */}
              {selectedItems.length > 0 && (
                <div className="border-t border-slate-300 bg-slate-100 p-2 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">الإجمالي</span>
                  <span className="text-sm font-bold text-teal-600">
                    <CurrencyDisplay amount={total} symbolSize={12} />
                  </span>
                </div>
              )}
            </div>
            
            {/* Notes */}
            <div>
              <Label className="text-sm text-gray-600 mb-2 block">ملاحظات</Label>
              <Textarea
                placeholder="أضف ملاحظات للفاتورة (اختياري)..."
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                className="resize-none border-gray-200"
                rows={2}
              />
            </div>
            
            {/* Invoice Type */}
            <div>
              <Label className="text-sm text-gray-600 mb-3 block">نوع الفاتورة</Label>
              <RadioGroup
                value={invoiceType}
                onValueChange={(v) => setInvoiceType(v as 'cash' | 'credit')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="cash" id="edit-cash" className="border-teal-500 text-teal-500" />
                  <Label htmlFor="edit-cash">نقدية</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="credit" id="edit-credit" className="border-amber-500 text-amber-500" />
                  <Label htmlFor="edit-credit">آجلة</Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Customer Selection */}
            {invoiceType === 'credit' && (
              <div className="pt-4 border-t">
                <Label className="text-sm text-gray-600 mb-2 block">العميل</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-12 border-gray-200 hover:border-amber-400"
                    >
                      {selectedCustomer ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-amber-600" />
                          <span className="font-medium">{selectedCustomer.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">اختر عميل...</span>
                      )}
                      <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="البحث عن عميل..." className="h-10" />
                      <CommandList className="max-h-60">
                        <CommandEmpty>لا يوجد عملاء</CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.name}
                              onSelect={() => setSelectedCustomer(customer)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-2 w-full">
                                <User className="h-4 w-4 text-gray-400" />
                                <div className="flex-1">
                                  <p className="font-medium">{customer.name}</p>
                                </div>
                                {selectedCustomer?.id === customer.id && (
                                  <Check className="h-4 w-4 text-amber-600" />
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedCustomer && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    <X className="h-4 w-4 ml-1" />
                    إزالة العميل
                  </Button>
                )}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                onClick={handleSubmit}
                disabled={isSubmitting || selectedItems.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  'حفظ التعديلات'
                )}
              </Button>
            </div>
          </div>
        )}
        
        {/* Product Search Dialog */}
        <Dialog open={showProductSearch} onOpenChange={setShowProductSearch}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-teal-600" />
                إضافة منتج
              </DialogTitle>
            </DialogHeader>
            
            <div className="relative mt-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="البحث عن منتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 h-12 text-base"
                autoFocus
              />
            </div>
            
            <div className="divide-y">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Package className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>لا توجد منتجات</p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <ProductSearchRow
                    key={product.id}
                    product={product}
                    onAdd={handleAddItem}
                  />
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

// Product Search Row Component
function ProductSearchRow({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (product: Product, unitId: string, quantity: number, salePrice: number) => void;
}) {
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [expanded, setExpanded] = useState(false);

  const totalPieces = calculateTotalPieces(product.units);
  const hasStock = totalPieces > 0;

  if (!hasStock) return null;

  const availableUnits = product.units.filter(unit => {
    const maxQuantity = Math.floor(totalPieces / unit.containsPieces);
    return maxQuantity >= 1;
  });

  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);
    setQuantity('');
    const unit = product.units.find(u => u.id === unitId);
    if (unit) {
      setSalePrice(unit.salePrice?.toString() || '');
    }
    setExpanded(true);
  };

  const handleAdd = () => {
    if (!selectedUnitId || !quantity || !salePrice) return;
    const qty = parseInt(quantity);
    const price = parseFloat(salePrice);
    if (qty <= 0 || price <= 0) return;
    
    onAdd(product, selectedUnitId, qty, price);
    setSelectedUnitId('');
    setQuantity('');
    setSalePrice('');
    setExpanded(false);
  };

  const selectedUnit = selectedUnitId ? product.units.find((u) => u.id === selectedUnitId) : null;

  return (
    <div className="hover:bg-gray-50 transition-colors">
      {/* Main Row */}
      <div className="grid grid-cols-12 gap-2 p-3 items-center">
        {/* Product Name */}
        <div className="col-span-5">
          <p className="font-medium text-gray-800 text-sm truncate">{product.name}</p>
        </div>

        {/* Stock Display */}
        <div className="col-span-3 text-center">
          <span className="text-xs text-slate-600">{formatStockDisplay(product.units)}</span>
        </div>

        {/* Unit Selector */}
        <div className="col-span-4">
          <Select value={selectedUnitId} onValueChange={handleUnitChange}>
            <SelectTrigger className="w-full h-8 text-sm">
              <SelectValue placeholder="اختر وحدة" />
            </SelectTrigger>
            <SelectContent>
              {availableUnits.map((unit) => {
                const maxQty = Math.floor(totalPieces / unit.containsPieces);
                return (
                  <SelectItem key={unit.id!} value={unit.id!}>
                    <div className="flex items-center gap-2">
                      <span className="text-teal-600">{getUnitIcon(unit.unitType)}</span>
                      <span>{unit.unitName}</span>
                      <span className="text-xs text-gray-400">({maxQty})</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Expanded Input Fields */}
      {expanded && selectedUnitId && selectedUnit && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100 bg-gradient-to-b from-slate-50 to-white">
          <div className="flex items-center gap-4 pt-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-500">الكمية:</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="w-16 h-8 text-sm text-center"
                min="1"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-500">السعر:</Label>
              <Input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0"
                className="w-20 h-8 text-sm"
                step="0.01"
              />
            </div>

            {quantity && salePrice && parseInt(quantity) > 0 && parseFloat(salePrice) > 0 && (
              <button
                onClick={handleAdd}
                className="p-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={() => {
                setExpanded(false);
                setSelectedUnitId('');
                setQuantity('');
                setSalePrice('');
              }}
              className="mr-auto p-1.5 text-gray-400 hover:text-red-500 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
