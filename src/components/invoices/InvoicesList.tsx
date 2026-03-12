'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  FileText,
  ChevronLeft,
  ShoppingCart,
  ShoppingBag,
  Calendar,
  Users,
  X,
  Filter,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import type { Invoice } from '@/types';

interface InvoicesListProps {
  isAdmin: boolean;
}

// Format date and time in Arabic
const formatDateTime = (dateStr: string) => {
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
};

// Format date for display
const formatDateShort = (dateStr: string) => {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr));
};

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-SA').format(amount) + ' ﷼';
};

// Purchase Invoice type
interface PurchaseInvoice {
  id: string;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    purchasePrice: number;
    unitName: string;
  }>;
}

// User type for filter
interface UserData {
  id: string;
  name: string;
}

export function InvoicesList({ isAdmin }: InvoicesListProps) {
  const user = useAuthStore((state) => state.user);
  
  // Tabs state (for admin)
  const [activeTab, setActiveTab] = useState<'sales' | 'purchase'>('sales');
  
  // Sales invoices
  const [salesInvoices, setSalesInvoices] = useState<Invoice[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(true);
  
  // Purchase invoices
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [isLoadingPurchase, setIsLoadingPurchase] = useState(false);
  
  // Selected invoice for details view
  const [selectedSalesInvoice, setSelectedSalesInvoice] = useState<Invoice | null>(null);
  const [selectedPurchaseInvoice, setSelectedPurchaseInvoice] = useState<PurchaseInvoice | null>(null);
  
  // Users for filter (admin only)
  const [users, setUsers] = useState<UserData[]>([]);
  
  // Filter dialog
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  
  // Fetch users for filter (admin only)
  useEffect(() => {
    if (isAdmin) {
      fetch('/api/users')
        .then((r) => r.json())
        .then((data) => setUsers(Array.isArray(data) ? data : []));
    }
  }, [isAdmin]);
  
  // Fetch sales invoices
  const fetchSalesInvoices = useCallback(async () => {
    setIsLoadingSales(true);
    try {
      const params = new URLSearchParams();
      
      if (isAdmin && selectedUserId) {
        params.append('userId', selectedUserId);
      } else if (!isAdmin && user?.id) {
        params.append('userId', user.id);
      }
      
      const startDateTime = startDate && startTime ? `${startDate} ${startTime}` : startDate;
      const endDateTime = endDate && endTime ? `${endDate} ${endTime}` : endDate;
      
      if (startDateTime) params.append('startDateTime', startDateTime);
      if (endDateTime) params.append('endDateTime', endDateTime);
      
      const url = `/api/invoices${params.toString() ? `?${params.toString()}` : ''}`;
      const data = await fetch(url).then((r) => r.json());
      setSalesInvoices(Array.isArray(data) ? data : []);
    } finally {
      setIsLoadingSales(false);
    }
  }, [isAdmin, user?.id, selectedUserId, startDate, endDate, startTime, endTime]);
  
  // Fetch purchase invoices
  const fetchPurchaseInvoices = useCallback(async () => {
    if (!isAdmin) return;
    
    setIsLoadingPurchase(true);
    try {
      const params = new URLSearchParams();
      
      if (selectedUserId) {
        params.append('userId', selectedUserId);
      }
      
      const startDateTime = startDate && startTime ? `${startDate} ${startTime}` : startDate;
      const endDateTime = endDate && endTime ? `${endDate} ${endTime}` : endDate;
      
      if (startDateTime) params.append('startDateTime', startDateTime);
      if (endDateTime) params.append('endDateTime', endDateTime);
      
      const url = `/api/purchase-invoices${params.toString() ? `?${params.toString()}` : ''}`;
      const data = await fetch(url).then((r) => r.json());
      setPurchaseInvoices(Array.isArray(data) ? data : []);
    } finally {
      setIsLoadingPurchase(false);
    }
  }, [isAdmin, selectedUserId, startDate, endDate, startTime, endTime]);
  
  // Fetch on mount and filter change
  useEffect(() => {
    fetchSalesInvoices();
    if (isAdmin) {
      fetchPurchaseInvoices();
    }
  }, [fetchSalesInvoices, fetchPurchaseInvoices, isAdmin]);
  
  // Clear all filters
  const clearAllFilters = () => {
    setStartDate('');
    setEndDate('');
    setStartTime('');
    setEndTime('');
    setSelectedUserId('');
    setShowFilterDialog(false);
  };
  
  // Clear specific filter
  const clearFilter = (filterType: string) => {
    switch (filterType) {
      case 'startDate':
        setStartDate('');
        setStartTime('');
        break;
      case 'endDate':
        setEndDate('');
        setEndTime('');
        break;
      case 'user':
        setSelectedUserId('');
        break;
    }
  };
  
  // Apply filters and close dialog
  const applyFilters = () => {
    setShowFilterDialog(false);
  };
  
  // Check if any filter is active
  const hasActiveFilters = startDate || endDate || startTime || endTime || selectedUserId;
  
  // Get selected user name
  const selectedUserName = users.find(u => u.id === selectedUserId)?.name || '';
  
  // Count active filters
  const activeFiltersCount = [
    startDate && 'startDate',
    endDate && 'endDate',
    selectedUserId && 'user',
  ].filter(Boolean).length;
  
  // Sales Invoice Details View
  if (selectedSalesInvoice) {
    return (
      <div className="p-4 pb-24">
        <Button variant="ghost" onClick={() => setSelectedSalesInvoice(null)} className="mb-4">
          <ChevronLeft className="h-5 w-5 ml-1" />
          العودة
        </Button>
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-l from-teal-500 to-emerald-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">فاتورة مبيعات</CardTitle>
              <Badge className={selectedSalesInvoice.invoiceType === 'cash' ? 'bg-white/20' : 'bg-amber-500'}>
                {selectedSalesInvoice.invoiceType === 'cash' ? 'نقد' : selectedSalesInvoice.invoiceType === 'credit' ? 'آجل' : 'يدوية'}
              </Badge>
            </div>
            <p className="text-sm text-white/80">
              {formatDateTime(selectedSalesInvoice.createdAt)}
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">المستخدم</p>
                  <p className="font-medium">{selectedSalesInvoice.user.name}</p>
                </div>
                {selectedSalesInvoice.customer && (
                  <div>
                    <p className="text-gray-500">العميل</p>
                    <p className="font-medium">{selectedSalesInvoice.customer.name}</p>
                  </div>
                )}
              </div>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold">المنتجات</h4>
                {selectedSalesInvoice.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-gray-500">
                        {item.quantity} {item.unitName} × {item.salePrice.toLocaleString()} ﷼
                      </p>
                    </div>
                    <p className="font-bold">{formatCurrency(item.quantity * item.salePrice)}</p>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-gray-500">الإجمالي</span>
                <span className="font-bold">{formatCurrency(selectedSalesInvoice.totalAmount)}</span>
              </div>
              {isAdmin && (
                <div className="flex justify-between">
                  <span className="text-gray-500">الربح</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(selectedSalesInvoice.totalProfit)}
                  </span>
                </div>
              )}
              {selectedSalesInvoice.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-gray-500 text-sm mb-1">ملاحظات</p>
                    <p className="bg-gray-50 p-3 rounded-lg text-sm">{selectedSalesInvoice.notes}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Purchase Invoice Details View
  if (selectedPurchaseInvoice) {
    return (
      <div className="p-4 pb-24">
        <Button variant="ghost" onClick={() => setSelectedPurchaseInvoice(null)} className="mb-4">
          <ChevronLeft className="h-5 w-5 ml-1" />
          العودة
        </Button>
        <Card className="shadow-md">
          <CardHeader className="bg-gradient-to-l from-amber-500 to-orange-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">فاتورة مشتريات</CardTitle>
              <Badge className="bg-white/20">مشتريات</Badge>
            </div>
            <p className="text-sm text-white/80">
              {formatDateTime(selectedPurchaseInvoice.createdAt)}
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="text-sm">
                <p className="text-gray-500">المستخدم</p>
                <p className="font-medium">{selectedPurchaseInvoice.user.name}</p>
              </div>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold">المنتجات</h4>
                {selectedPurchaseInvoice.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-gray-500">
                        {item.quantity} {item.unitName} × {item.purchasePrice.toLocaleString()} ﷼
                      </p>
                    </div>
                    <p className="font-bold">{formatCurrency(item.quantity * item.purchasePrice)}</p>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-gray-500">الإجمالي</span>
                <span className="font-bold">{formatCurrency(selectedPurchaseInvoice.totalAmount)}</span>
              </div>
              {selectedPurchaseInvoice.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-gray-500 text-sm mb-1">ملاحظات</p>
                    <p className="bg-gray-50 p-3 rounded-lg text-sm">{selectedPurchaseInvoice.notes}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Active Filter Badge Component
  const ActiveFilterBadge = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 pr-1 gap-1">
      {label}
      <button
        onClick={onRemove}
        className="p-0.5 hover:bg-blue-300 rounded-full mr-1"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
  
  // Admin View with Tabs
  if (isAdmin) {
    return (
      <div className="p-4 pb-24">
        {/* Header with Filter Button */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowFilterDialog(true)}
          >
            <Filter className="h-4 w-4" />
            فلترة
            {activeFiltersCount > 0 && (
              <Badge className="bg-teal-500 text-white ml-1 px-1.5 py-0.5 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
          
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={clearAllFilters}
            >
              <X className="h-4 w-4 ml-1" />
              مسح الكل
            </Button>
          )}
        </div>
        
        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {startDate && (
              <ActiveFilterBadge
                label={`من: ${formatDateShort(startDate)}${startTime ? ` ${startTime}` : ''}`}
                onRemove={() => clearFilter('startDate')}
              />
            )}
            {endDate && (
              <ActiveFilterBadge
                label={`إلى: ${formatDateShort(endDate)}${endTime ? ` ${endTime}` : ''}`}
                onRemove={() => clearFilter('endDate')}
              />
            )}
            {selectedUserId && (
              <ActiveFilterBadge
                label={`المستخدم: ${selectedUserName}`}
                onRemove={() => clearFilter('user')}
              />
            )}
          </div>
        )}
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sales' | 'purchase')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              فواتير المبيعات
            </TabsTrigger>
            <TabsTrigger value="purchase" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              فواتير المشتريات
            </TabsTrigger>
          </TabsList>
          
          {/* Sales Invoices Tab */}
          <TabsContent value="sales">
            {isLoadingSales ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              </div>
            ) : salesInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد فواتير مبيعات</p>
              </div>
            ) : (
              <div className="space-y-3">
                {salesInvoices.map((invoice) => (
                  <Card
                    key={invoice.id}
                    className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedSalesInvoice(invoice)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-teal-600" />
                          </div>
                          <div>
                            <p className="font-medium">{invoice.user.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatDateTime(invoice.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-bold">{formatCurrency(invoice.totalAmount)}</p>
                          <Badge
                            className={`text-xs ${
                              invoice.invoiceType === 'cash' 
                                ? 'bg-teal-100 text-teal-700' 
                                : invoice.invoiceType === 'credit'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {invoice.invoiceType === 'cash' ? 'نقد' : invoice.invoiceType === 'credit' ? 'آجل' : 'يدوية'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Purchase Invoices Tab */}
          <TabsContent value="purchase">
            {isLoadingPurchase ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              </div>
            ) : purchaseInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد فواتير مشتريات</p>
              </div>
            ) : (
              <div className="space-y-3">
                {purchaseInvoices.map((invoice) => (
                  <Card
                    key={invoice.id}
                    className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedPurchaseInvoice(invoice)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <ShoppingBag className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-medium">{invoice.user.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatDateTime(invoice.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-bold">{formatCurrency(invoice.totalAmount)}</p>
                          <Badge className="bg-amber-100 text-amber-700 text-xs">
                            مشتريات
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Filter Dialog */}
        <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-teal-600" />
                تصفية الفواتير
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Date Filters */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Calendar className="h-4 w-4 text-teal-600" />
                  التاريخ
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500">من تاريخ</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">إلى تاريخ</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
              
              {/* Time Filters */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Clock className="h-4 w-4 text-teal-600" />
                  الوقت
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500">من وقت</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">إلى وقت</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
              
              {/* User Filter */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Users className="h-4 w-4 text-teal-600" />
                  المستخدم
                </div>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full h-10 px-3 border rounded-lg text-sm bg-white"
                >
                  <option value="">جميع المستخدمين</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                  onClick={applyFilters}
                >
                  تطبيق الفلترة
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={clearAllFilters}
                >
                  مسح الفلاتر
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  
  // Regular User View (no tabs, just their sales invoices)
  return (
    <div className="p-4 pb-24">
      {/* Header with Filter Button */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => setShowFilterDialog(true)}
        >
          <Filter className="h-4 w-4" />
          فلترة
          {activeFiltersCount > 0 && (
            <Badge className="bg-teal-500 text-white ml-1 px-1.5 py-0.5 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={clearAllFilters}
          >
            <X className="h-4 w-4 ml-1" />
            مسح الكل
          </Button>
        )}
      </div>
      
      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {startDate && (
            <ActiveFilterBadge
              label={`من: ${formatDateShort(startDate)}${startTime ? ` ${startTime}` : ''}`}
              onRemove={() => clearFilter('startDate')}
            />
          )}
          {endDate && (
            <ActiveFilterBadge
              label={`إلى: ${formatDateShort(endDate)}${endTime ? ` ${endTime}` : ''}`}
              onRemove={() => clearFilter('endDate')}
            />
          )}
        </div>
      )}
      
      {/* Invoices List */}
      {isLoadingSales ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : salesInvoices.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">لا توجد فواتير</p>
        </div>
      ) : (
        <div className="space-y-3">
          {salesInvoices.map((invoice) => (
            <Card
              key={invoice.id}
              className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedSalesInvoice(invoice)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium">فاتورة #{invoice.id.slice(-6)}</p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(invoice.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold">{formatCurrency(invoice.totalAmount)}</p>
                    <Badge
                      className={`text-xs ${
                        invoice.invoiceType === 'cash' 
                          ? 'bg-teal-100 text-teal-700' 
                          : invoice.invoiceType === 'credit'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {invoice.invoiceType === 'cash' ? 'نقد' : invoice.invoiceType === 'credit' ? 'آجل' : 'يدوية'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-teal-600" />
              تصفية الفواتير
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Date Filters */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4 text-teal-600" />
                التاريخ
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">من تاريخ</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">إلى تاريخ</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            </div>
            
            {/* Time Filters */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Clock className="h-4 w-4 text-teal-600" />
                الوقت
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">من وقت</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">إلى وقت</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                onClick={applyFilters}
              >
                تطبيق الفلترة
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={clearAllFilters}
              >
                مسح الفلاتر
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
