'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { 
  Loader2, 
  ArrowLeft, 
  FileText, 
  ShoppingCart, 
  Package,
  Calendar,
  Filter
} from 'lucide-react';
import { formatYemenDateTime } from '@/lib/date-utils';

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

export function ProductInvoices({ productId, productName, onBack }: ProductInvoicesProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sales' | 'purchases'>('all');
  const [stats, setStats] = useState({ salesCount: 0, purchaseCount: 0, totalCount: 0 });

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (filterType !== 'all') params.append('type', filterType);

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
  }, [productId, startDate, endDate, filterType]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setFilterType('all');
  };

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

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-lg font-bold">فواتير المنتج</h2>
          <p className="text-sm text-gray-500">{productName}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Card className="bg-teal-50 border-teal-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-teal-700">{stats.salesCount}</p>
            <p className="text-xs text-teal-600">مبيعات</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{stats.purchaseCount}</p>
            <p className="text-xs text-blue-600">مشتريات</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{totalProfit.toFixed(0)}</p>
            <p className="text-xs text-green-600">ربح</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            الفلاتر
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">من تاريخ</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">إلى تاريخ</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">نوع الفاتورة</label>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as 'all' | 'sales' | 'purchases')}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="sales">مبيعات</SelectItem>
                <SelectItem value="purchases">مشتريات</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(startDate || endDate || filterType !== 'all') && (
            <Button variant="outline" size="sm" className="w-full" onClick={clearFilters}>
              مسح الفلاتر
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Quantity Summary */}
      {(totalSalesQuantity > 0 || totalPurchasesQuantity > 0) && (
        <div className="flex gap-2 mb-4">
          {totalSalesQuantity > 0 && (
            <Badge className="bg-teal-100 text-teal-700">
              <ShoppingCart className="h-3 w-3 ml-1" />
              بيع: {totalSalesQuantity}
            </Badge>
          )}
          {totalPurchasesQuantity > 0 && (
            <Badge className="bg-blue-100 text-blue-700">
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
        </div>
      ) : (
        <Accordion type="single" className="space-y-2">
          {invoices.map((invoice) => (
            <AccordionItem 
              key={`${invoice.type}-${invoice.id}`} 
              value={`${invoice.type}-${invoice.id}`}
              className="border rounded-lg bg-white shadow-sm"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {invoice.type === 'sales' ? (
                      <ShoppingCart className="h-4 w-4 text-teal-600" />
                    ) : (
                      <Package className="h-4 w-4 text-blue-600" />
                    )}
                    <span className="font-medium">
                      {invoice.type === 'sales' ? 'فاتورة مبيعات' : 'فاتورة مشتريات'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-3 w-3" />
                    {formatYemenDateTime(invoice.createdAt)}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">الكمية</p>
                      <p className="font-semibold">{invoice.quantity}</p>
                    </div>
                    {invoice.type === 'sales' && invoice.salePrice && (
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-500">سعر البيع</p>
                        <p className="font-semibold">{invoice.salePrice} ﷼</p>
                      </div>
                    )}
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">سعر الشراء</p>
                      <p className="font-semibold">
                        {invoice.type === 'sales' ? invoice.itemPurchasePrice : invoice.purchasePrice} ﷼
                      </p>
                    </div>
                    {invoice.type === 'sales' && invoice.profit !== undefined && (
                      <div className="bg-green-50 rounded-lg p-2">
                        <p className="text-xs text-green-600">الربح</p>
                        <p className="font-semibold text-green-700">{invoice.profit.toFixed(0)} ﷼</p>
                      </div>
                    )}
                  </div>
                  
                  {invoice.customerName && (
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">العميل</p>
                      <p className="font-medium">{invoice.customerName}</p>
                    </div>
                  )}
                  
                  {invoice.notes && (
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">ملاحظات</p>
                      <p className="text-sm">{invoice.notes}</p>
                    </div>
                  )}
                  
                  {invoice.unitName && (
                    <Badge variant="outline" className="text-xs">
                      الوحدة: {invoice.unitName}
                    </Badge>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
