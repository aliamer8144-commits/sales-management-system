'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Loader2,
  ArrowLeft,
  FileText,
  ShoppingCart,
  Package,
  Calendar,
  Filter,
  X,
  TrendingUp
} from 'lucide-react';
import { formatYemenDateTime } from '@/lib/date-utils';
import { CurrencyDisplay } from '@/components/ui/saudi-riyal-symbol';

interface ProductInvoicesProps {
  productId: string;
  productName: string;
  onBack: () => void;
}

interface Invoice {
  id: string;
  type: 'sales' | 'purchases';
  invoiceType?: string;
  totalAmount: number;
  totalProfit: number;
  createdAt: string;
  customerName?: string;
  notes?: string;
  quantity: number;
  salePrice?: number;
  purchasePrice: number;
  itemPurchasePrice?: number;
  unitType?: string;
  unitName?: string;
  profit?: number;
}

interface FilterState {
  startDate: string;
  endDate: string;
  type: 'all' | 'sales' | 'purchases';
}

export function ProductInvoices({ productId, productName, onBack }: ProductInvoicesProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  
  // Applied filters (shown in UI)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    type: 'all'
  });
  
  // Temporary filters (in dialog)
  const [tempFilters, setTempFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    type: 'all'
  });
  
  const [stats, setStats] = useState({ salesCount: 0, purchaseCount: 0, totalCount: 0 });

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (appliedFilters.startDate) params.append('startDate', appliedFilters.startDate);
      if (appliedFilters.endDate) params.append('endDate', appliedFilters.endDate);
      if (appliedFilters.type !== 'all') params.append('type', appliedFilters.type);

      const response = await fetch(`/api/products/${productId}/invoices?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setInvoices(data.invoices);
        setStats({
          salesCount: data.salesCount,
          purchaseCount: data.purchaseCount,
          totalCount: data.totalCount
        });
      }
    } catch (error) {
      console.error('Error fetching product invoices:', error);
    } finally {
      setIsLoading(false);
    }
  }, [productId, appliedFilters]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Open filter dialog
  const openFilterDialog = () => {
    setTempFilters({ ...appliedFilters });
    setShowFilterDialog(true);
  };

  // Apply filters
  const applyFilters = () => {
    setAppliedFilters({ ...tempFilters });
    setShowFilterDialog(false);
  };

  // Remove specific filter
  const removeFilter = (filterKey: keyof FilterState) => {
    setAppliedFilters(prev => ({
      ...prev,
      [filterKey]: filterKey === 'type' ? 'all' : ''
    }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setAppliedFilters({
      startDate: '',
      endDate: '',
      type: 'all'
    });
  };

  // Check if any filter is active
  const hasActiveFilters = appliedFilters.startDate || appliedFilters.endDate || appliedFilters.type !== 'all';

  // Calculate totals
  const totalSalesQuantity = invoices
    .filter(i => i.type === 'sales')
    .reduce((sum, i) => sum + i.quantity, 0);
  
  const totalPurchasesQuantity = invoices
    .filter(i => i.type === 'purchases')
    .reduce((sum, i) => sum + i.quantity, 0);

  const totalProfit = invoices
    .filter(i => i.type === 'sales')
    .reduce((sum, i) => sum + (i.profit || 0), 0);

  // Format date for display
  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-YE');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b shadow-sm z-40">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-bold">فواتير المنتج</h2>
            <p className="text-sm text-gray-500">{productName}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={openFilterDialog}
            className={hasActiveFilters ? 'border-teal-500 text-teal-600' : ''}
          >
            <Filter className="h-4 w-4 ml-1" />
            فلترة
            {hasActiveFilters && (
              <Badge className="bg-teal-500 text-white text-xs mr-1 h-5 w-5 p-0 flex items-center justify-center rounded-full">
               !
              </Badge>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 pb-24">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
            <CardContent className="p-3 text-center">
              <ShoppingCart className="h-5 w-5 mx-auto mb-1 text-teal-600" />
              <p className="text-2xl font-bold text-teal-700">{stats.salesCount}</p>
              <p className="text-xs text-teal-600">مبيعات</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-3 text-center">
              <Package className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <p className="text-2xl font-bold text-blue-700">{stats.purchaseCount}</p>
              <p className="text-xs text-blue-600">مشتريات</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <p className="text-2xl font-bold text-green-700">
                <CurrencyDisplay amount={totalProfit} symbolSize={12} />
              </p>
              <p className="text-xs text-green-600">ربح</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">الفلاتر النشطة:</span>
              <Button variant="ghost" size="sm" className="text-xs h-7 text-red-500" onClick={clearAllFilters}>
                مسح الكل
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {appliedFilters.startDate && (
                <Badge variant="secondary" className="bg-teal-100 text-teal-700 gap-1 py-1.5 px-3">
                  <Calendar className="h-3 w-3" />
                  من: {formatDateForDisplay(appliedFilters.startDate)}
                  <X
                    className="h-3 w-3 mr-1 cursor-pointer hover:text-red-500"
                    onClick={() => removeFilter('startDate')}
                  />
                </Badge>
              )}
              {appliedFilters.endDate && (
                <Badge variant="secondary" className="bg-teal-100 text-teal-700 gap-1 py-1.5 px-3">
                  <Calendar className="h-3 w-3" />
                  إلى: {formatDateForDisplay(appliedFilters.endDate)}
                  <X
                    className="h-3 w-3 mr-1 cursor-pointer hover:text-red-500"
                    onClick={() => removeFilter('endDate')}
                  />
                </Badge>
              )}
              {appliedFilters.type !== 'all' && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 gap-1 py-1.5 px-3">
                  {appliedFilters.type === 'sales' ? <ShoppingCart className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                  {appliedFilters.type === 'sales' ? 'مبيعات' : 'مشتريات'}
                  <X
                    className="h-3 w-3 mr-1 cursor-pointer hover:text-red-500"
                    onClick={() => removeFilter('type')}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Quantity Summary */}
        {(totalSalesQuantity > 0 || totalPurchasesQuantity > 0) && (
          <div className="flex gap-2 mb-4">
            {totalSalesQuantity > 0 && (
              <Badge className="bg-teal-100 text-teal-700 py-1.5">
                <ShoppingCart className="h-3 w-3 ml-1" />
                بيع: {totalSalesQuantity}
              </Badge>
            )}
            {totalPurchasesQuantity > 0 && (
              <Badge className="bg-blue-100 text-blue-700 py-1.5">
                <Package className="h-3 w-3 ml-1" />
                شراء: {totalPurchasesQuantity}
              </Badge>
            )}
          </div>
        )}

        {/* Invoices List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">لا توجد فواتير لهذا المنتج</p>
            {hasActiveFilters && (
              <Button variant="link" className="text-teal-600 mt-2" onClick={clearAllFilters}>
                مسح الفلاتر
              </Button>
            )}
          </div>
        ) : (
          <Accordion type="single" className="space-y-2">
            {invoices.map((invoice) => (
              <AccordionItem
                key={`${invoice.type}-${invoice.id}`}
                value={`${invoice.type}-${invoice.id}`}
                className="border rounded-lg bg-white shadow-sm overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${invoice.type === 'sales' ? 'bg-teal-100' : 'bg-blue-100'}`}>
                        {invoice.type === 'sales' ? (
                          <ShoppingCart className="h-4 w-4 text-teal-600" />
                        ) : (
                          <Package className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-medium block">
                          {invoice.type === 'sales' ? 'فاتورة مبيعات' : 'فاتورة مشتريات'}
                        </span>
                        {invoice.customerName && (
                          <span className="text-xs text-gray-500">{invoice.customerName}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span className="text-xs">{formatYemenDateTime(invoice.createdAt)}</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3 pt-2 border-t">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">الكمية</p>
                        <p className="font-semibold text-lg">{invoice.quantity}</p>
                        {invoice.unitName && (
                          <p className="text-xs text-gray-400">{invoice.unitName}</p>
                        )}
                      </div>
                      {invoice.type === 'sales' && invoice.salePrice && (
                        <div className="bg-teal-50 rounded-lg p-3">
                          <p className="text-xs text-teal-600 mb-1">سعر البيع</p>
                          <p className="font-semibold text-lg text-teal-700">
                            <CurrencyDisplay amount={invoice.salePrice} />
                          </p>
                        </div>
                      )}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">سعر الشراء</p>
                        <p className="font-semibold text-lg">
                          <CurrencyDisplay amount={invoice.type === 'sales' ? (invoice.itemPurchasePrice || 0) : invoice.purchasePrice} />
                        </p>
                      </div>
                      {invoice.type === 'sales' && invoice.profit !== undefined && (
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-xs text-green-600 mb-1">الربح</p>
                          <p className="font-semibold text-lg text-green-700">
                            <CurrencyDisplay amount={invoice.profit} />
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {invoice.notes && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">ملاحظات</p>
                        <p className="text-sm">{invoice.notes}</p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              فلترة الفواتير
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Date Range */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                نطاق التاريخ
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">من تاريخ</label>
                  <Input
                    type="date"
                    value={tempFilters.startDate}
                    onChange={(e) => setTempFilters({ ...tempFilters, startDate: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">إلى تاريخ</label>
                  <Input
                    type="date"
                    value={tempFilters.endDate}
                    onChange={(e) => setTempFilters({ ...tempFilters, endDate: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>
            </div>

            {/* Invoice Type */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                نوع الفاتورة
              </h4>
              <Select
                value={tempFilters.type}
                onValueChange={(v) => setTempFilters({ ...tempFilters, type: v as 'all' | 'sales' | 'purchases' })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفواتير</SelectItem>
                  <SelectItem value="sales">مبيعات فقط</SelectItem>
                  <SelectItem value="purchases">مشتريات فقط</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setTempFilters({ startDate: '', endDate: '', type: 'all' });
              }}
            >
              مسح
            </Button>
            <Button onClick={applyFilters} className="bg-teal-600 hover:bg-teal-700">
              تطبيق الفلترة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
