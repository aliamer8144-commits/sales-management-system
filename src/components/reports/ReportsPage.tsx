'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2, Users, User, DollarSign, TrendingUp, ChevronLeft, ChevronDown, ChevronUp, FileText, Banknote, ShoppingCart, ShoppingBag, Filter, CreditCard, Wallet, Package } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { CurrencyDisplay } from '@/components/ui/saudi-riyal-symbol';
import { formatYemenDateTime } from '@/lib/date-utils';

interface UserStats {
  id: string;
  name: string;
  totalInvoices: number;
  totalSales: number;
  totalProfit: number;
}

interface UserReport {
  user: { id: string; name: string; email: string } | null;
  totalInvoices: number;
  totalSales: number;
  totalProfit: number;
}

interface DetailedReport {
  stats: {
    totalSales: number;
    totalProfit: number;
    totalPayments: number;
    totalDebts: number;
    totalCashInvoices: number;
    totalCreditInvoices: number;
  };
  transactions: Array<{
    id: string;
    type: 'cash_invoice' | 'credit_invoice' | 'purchase_invoice' | 'payment';
    date: string;
    amount: number;
    profit?: number;
    customerName?: string;
    userName: string;
    invoiceType?: string;
  }>;
}

interface InvoiceDetails {
  id: string;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitName: string;
    salePrice: number;
    purchasePrice: number;
  }>;
  totalAmount: number;
  totalProfit: number;
  notes?: string;
  createdAt: string;
  customer?: { name: string } | null;
  user: { name: string };
}

interface PaymentDetails {
  id: string;
  amount: number;
  notes?: string;
  createdAt: string;
  customer?: { name: string } | null;
  user: { name: string };
}

export function ReportsPage() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProfit: 0,
    totalInvoices: 0,
    totalCredit: 0,
    totalCapital: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Users for reports
  const [users, setUsers] = useState<UserStats[]>([]);

  // Selected user report
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userReport, setUserReport] = useState<UserReport | null>(null);
  const [userReportLoading, setUserReportLoading] = useState(false);

  // Detailed report view
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [detailedReport, setDetailedReport] = useState<DetailedReport | null>(null);
  const [detailedReportLoading, setDetailedReportLoading] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<string>('all');

  // Expanded transaction details (accordion)
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);
  const [transactionDetails, setTransactionDetails] = useState<Record<string, InvoiceDetails | PaymentDetails>>({});
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);

  // Fetch summary stats
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const startDateTime = startDate && startTime ? `${startDate} ${startTime}` : startDate;
      const endDateTime = endDate && endTime ? `${endDate} ${endTime}` : endDate;

      const params = new URLSearchParams();
      if (startDateTime) params.append('startDateTime', startDateTime);
      if (endDateTime) params.append('endDateTime', endDateTime);

      try {
        const res = await fetch(`/api/reports?${params.toString()}`);
        const data = await res.json();
        setStats(data);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, startTime, endTime]);

  // Fetch users stats
  useEffect(() => {
    const fetchUsers = async () => {
      const startDateTime = startDate && startTime ? `${startDate} ${startTime}` : startDate;
      const endDateTime = endDate && endTime ? `${endDate} ${endTime}` : endDate;

      const params = new URLSearchParams({ type: 'users' });
      if (startDateTime) params.append('startDateTime', startDateTime);
      if (endDateTime) params.append('endDateTime', endDateTime);

      try {
        const res = await fetch(`/api/reports?${params.toString()}`);
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (e) {
        setUsers([]);
      }
    };

    fetchUsers();
  }, [startDate, endDate, startTime, endTime]);

  // Fetch selected user report
  useEffect(() => {
    const fetchUserReport = async () => {
      if (!selectedUserId) {
        setUserReport(null);
        return;
      }

      setUserReportLoading(true);
      const startDateTime = startDate && startTime ? `${startDate} ${startTime}` : startDate;
      const endDateTime = endDate && endTime ? `${endDate} ${endTime}` : endDate;

      const params = new URLSearchParams({ type: 'user-report', userId: selectedUserId });
      if (startDateTime) params.append('startDateTime', startDateTime);
      if (endDateTime) params.append('endDateTime', endDateTime);

      try {
        const res = await fetch(`/api/reports?${params.toString()}`);
        const data = await res.json();
        setUserReport(data);
      } finally {
        setUserReportLoading(false);
      }
    };

    fetchUserReport();
  }, [selectedUserId, startDate, endDate, startTime, endTime]);

  // Fetch detailed report
  const fetchDetailedReport = async () => {
    setDetailedReportLoading(true);
    const startDateTime = startDate && startTime ? `${startDate} ${startTime}` : startDate;
    const endDateTime = endDate && endTime ? `${endDate} ${endTime}` : endDate;

    const params = new URLSearchParams({ type: 'detailed' });
    if (startDateTime) params.append('startDateTime', startDateTime);
    if (endDateTime) params.append('endDateTime', endDateTime);
    if (selectedUserId) params.append('userId', selectedUserId);

    try {
      const res = await fetch(`/api/reports?${params.toString()}`);
      const data = await res.json();
      setDetailedReport(data);
      setShowDetailedReport(true);
    } finally {
      setDetailedReportLoading(false);
    }
  };

  // Fetch transaction details
  const fetchTransactionDetails = async (transactionId: string, type: string) => {
    if (transactionDetails[transactionId]) {
      // Already loaded, just toggle
      setExpandedTransactionId(expandedTransactionId === transactionId ? null : transactionId);
      return;
    }

    setLoadingDetails(transactionId);

    try {
      let endpoint = '';
      if (type === 'cash_invoice' || type === 'credit_invoice') {
        endpoint = `/api/invoices/${transactionId}`;
      } else if (type === 'purchase_invoice') {
        endpoint = `/api/purchase-invoices/${transactionId}`;
      } else if (type === 'payment') {
        endpoint = `/api/payments/${transactionId}`;
      }

      if (endpoint) {
        const res = await fetch(endpoint);
        const data = await res.json();
        setTransactionDetails(prev => ({
          ...prev,
          [transactionId]: data,
        }));
        setExpandedTransactionId(transactionId);
      }
    } finally {
      setLoadingDetails(null);
    }
  };

  // Handle transaction click (toggle accordion)
  const handleTransactionClick = (transactionId: string, type: string) => {
    if (expandedTransactionId === transactionId) {
      setExpandedTransactionId(null);
    } else {
      fetchTransactionDetails(transactionId, type);
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setStartTime('');
    setEndTime('');
    setSelectedUserId('');
  };

  // Format date and time
  const formatDateTime = (dateStr: string) => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  // Filter transactions
  const filteredTransactions = detailedReport?.transactions.filter((t) => {
    if (transactionFilter === 'all') return true;
    if (transactionFilter === 'sales') return t.type === 'cash_invoice' || t.type === 'credit_invoice';
    if (transactionFilter === 'cash') return t.type === 'cash_invoice';
    if (transactionFilter === 'credit') return t.type === 'credit_invoice';
    if (transactionFilter === 'purchase') return t.type === 'purchase_invoice';
    if (transactionFilter === 'payments') return t.type === 'payment';
    return true;
  }) || [];

  // Get transaction type label and color
  const getTransactionTypeInfo = (type: string) => {
    switch (type) {
      case 'cash_invoice':
        return { label: 'نقد', color: 'bg-teal-100 text-teal-700', icon: ShoppingCart };
      case 'credit_invoice':
        return { label: 'آجل', color: 'bg-amber-100 text-amber-700', icon: CreditCard };
      case 'purchase_invoice':
        return { label: 'مشتريات', color: 'bg-orange-100 text-orange-700', icon: ShoppingBag };
      case 'payment':
        return { label: 'قبض', color: 'bg-green-100 text-green-700', icon: Banknote };
      default:
        return { label: type, color: 'bg-gray-100 text-gray-700', icon: FileText };
    }
  };

  // Render transaction details (accordion content)
  const renderTransactionDetails = (transactionId: string, type: string) => {
    const details = transactionDetails[transactionId];
    const isLoading = loadingDetails === transactionId;

    if (isLoading) {
      return (
        <div className="flex justify-center py-4 bg-gray-50 rounded-b-lg">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
        </div>
      );
    }

    if (!details) return null;

    if (type === 'payment') {
      const payment = details as PaymentDetails;
      return (
        <div className="p-4 bg-gray-50 rounded-b-lg border-t">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">العميل:</span>
              <span className="font-medium">{payment.customer?.name || '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">المبلغ:</span>
              <span className="font-bold text-green-600"><CurrencyDisplay amount={payment.amount} symbolSize={12} /></span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">المستخدم:</span>
              <span>{payment.user?.name}</span>
            </div>
            {payment.notes && (
              <div className="mt-2 p-2 bg-white rounded border text-sm">
                <span className="text-gray-500">ملاحظات: </span>
                {payment.notes}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Invoice details
    const invoice = details as InvoiceDetails;
    return (
      <div className="p-4 bg-gray-50 rounded-b-lg border-t">
        {/* Customer & User Info */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
          <div>
            <span className="text-gray-500">العميل: </span>
            <span className="font-medium">{invoice.customer?.name || '—'}</span>
          </div>
          <div>
            <span className="text-gray-500">المستخدم: </span>
            <span>{invoice.user?.name}</span>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2 mb-3">
          <span className="text-sm font-medium text-gray-700">المنتجات:</span>
          {invoice.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center p-2 bg-white rounded text-sm">
              <div>
                <span className="font-medium">{item.productName}</span>
                <span className="text-gray-500 text-xs mr-2">
                  ({item.quantity} {item.unitName} × <CurrencyDisplay amount={item.salePrice} symbolSize={10} />)
                </span>
              </div>
              <span className="font-medium">
                <CurrencyDisplay amount={item.quantity * item.salePrice} symbolSize={10} />
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t pt-2 space-y-1">
          <div className="flex justify-between text-sm font-medium">
            <span>الإجمالي:</span>
            <span><CurrencyDisplay amount={invoice.totalAmount} symbolSize={12} /></span>
          </div>
          {invoice.totalProfit > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>الربح:</span>
              <span><CurrencyDisplay amount={invoice.totalProfit} symbolSize={10} /></span>
            </div>
          )}
        </div>

        {invoice.notes && (
          <div className="mt-2 p-2 bg-white rounded border text-sm">
            <span className="text-gray-500">ملاحظات: </span>
            {invoice.notes}
          </div>
        )}
      </div>
    );
  };

  // Detailed Report View
  if (showDetailedReport && detailedReport) {
    return (
      <div className="p-4 pb-24 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setShowDetailedReport(false)} className="p-2">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-gray-800">تفاصيل التقرير</h1>
            <p className="text-xs text-gray-500">
              {startDate && `من ${startDate}`}
              {endDate && ` إلى ${endDate}`}
              {selectedUserId && ` - ${users.find(u => u.id === selectedUserId)?.name}`}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-blue-700">إجمالي المبيعات</span>
              </div>
              <p className="text-lg font-bold text-blue-800">
                <CurrencyDisplay amount={detailedReport.stats.totalSales} symbolSize={14} />
              </p>
              <p className="text-xs text-blue-600 mt-1">
                نقد: <CurrencyDisplay amount={detailedReport.stats.totalCashInvoices} symbolSize={10} /> | 
                آجل: <CurrencyDisplay amount={detailedReport.stats.totalCreditInvoices} symbolSize={10} />
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-emerald-700">إجمالي الأرباح</span>
              </div>
              <p className="text-lg font-bold text-emerald-800">
                <CurrencyDisplay amount={detailedReport.stats.totalProfit} symbolSize={14} />
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-teal-50 border-green-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Banknote className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-700">سندات القبض</span>
              </div>
              <p className="text-lg font-bold text-green-800">
                <CurrencyDisplay amount={detailedReport.stats.totalPayments} symbolSize={14} />
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-4 w-4 text-amber-600" />
                <span className="text-xs text-amber-700">إجمالي الديون</span>
              </div>
              <p className="text-lg font-bold text-amber-800">
                <CurrencyDisplay amount={detailedReport.stats.totalDebts} symbolSize={14} />
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transaction Filter */}
        <Card className="shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">تصفية العمليات</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={transactionFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTransactionFilter('all')}
                className={transactionFilter === 'all' ? 'bg-teal-600' : ''}
              >
                الكل
              </Button>
              <Button
                variant={transactionFilter === 'sales' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTransactionFilter('sales')}
                className={transactionFilter === 'sales' ? 'bg-teal-600' : ''}
              >
                <ShoppingCart className="h-3 w-3 ml-1" />
                فواتير المبيعات
              </Button>
              <Button
                variant={transactionFilter === 'cash' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTransactionFilter('cash')}
                className={transactionFilter === 'cash' ? 'bg-teal-600' : ''}
              >
                نقدية
              </Button>
              <Button
                variant={transactionFilter === 'credit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTransactionFilter('credit')}
                className={transactionFilter === 'credit' ? 'bg-teal-600' : ''}
              >
                آجلة
              </Button>
              <Button
                variant={transactionFilter === 'purchase' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTransactionFilter('purchase')}
                className={transactionFilter === 'purchase' ? 'bg-teal-600' : ''}
              >
                <ShoppingBag className="h-3 w-3 ml-1" />
                مشتريات
              </Button>
              <Button
                variant={transactionFilter === 'payments' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTransactionFilter('payments')}
                className={transactionFilter === 'payments' ? 'bg-teal-600' : ''}
              >
                <Banknote className="h-3 w-3 ml-1" />
                سندات القبض
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">سجل العمليات</span>
              <span className="text-xs text-gray-500">{filteredTransactions.length} عملية</span>
            </div>

            {filteredTransactions.length === 0 ? (
              <p className="text-center text-gray-400 py-8">لا توجد عمليات</p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {filteredTransactions.map((transaction) => {
                  const typeInfo = getTransactionTypeInfo(transaction.type);
                  const Icon = typeInfo.icon;
                  const isExpanded = expandedTransactionId === transaction.id;
                  const isLoading = loadingDetails === transaction.id;

                  return (
                    <div
                      key={`${transaction.type}-${transaction.id}`}
                      className="bg-gray-50 rounded-lg overflow-hidden"
                    >
                      {/* Transaction Header - Clickable */}
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleTransactionClick(transaction.id, transaction.type)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${typeInfo.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800">
                                #{transaction.id.slice(-6)}
                              </span>
                              <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                            </div>
                            <p className="text-xs text-gray-500">
                              {formatYemenDateTime(transaction.date)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {transaction.customerName || '—'} • {transaction.userName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-left">
                            <p className={`font-bold ${transaction.type === 'purchase_invoice' ? 'text-orange-600' : 'text-gray-800'}`}>
                              <CurrencyDisplay amount={transaction.amount} symbolSize={12} />
                            </p>
                            {transaction.profit !== undefined && transaction.profit > 0 && (
                              <p className="text-xs text-green-600">
                                +<CurrencyDisplay amount={transaction.profit} symbolSize={10} /> ربح
                              </p>
                            )}
                          </div>
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          ) : isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Accordion Content - Details */}
                      {isExpanded && renderTransactionDetails(transaction.id, transaction.type)}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Reports View
  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Date & Time Filter */}
      <Card className="shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-gray-500" />
            <span className="font-medium">تصفية حسب التاريخ والوقت</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-xs">من تاريخ</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">إلى تاريخ</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-xs">من وقت</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">إلى وقت</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {(startDate || endDate || startTime || endTime) && (
            <button
              className="text-sm text-teal-600 hover:underline"
              onClick={clearFilters}
            >
              مسح التصفية
            </button>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            title="إجمالي المبيعات"
            value={<CurrencyDisplay amount={stats.totalSales} symbolSize={14} />}
            icon={DollarSign}
          />
          <StatCard
            title="صافي الأرباح"
            value={<CurrencyDisplay amount={stats.totalProfit} symbolSize={14} />}
            icon={TrendingUp}
            color="emerald"
          />
        </div>
      )}

      {/* User Selection for Report */}
      <Card className="shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-5 w-5 text-gray-500" />
            <span className="font-medium">تقرير مستخدم محدد</span>
          </div>

          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full h-10 px-3 border rounded-lg text-sm bg-white"
          >
            <option value="">اختر مستخدم</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {userReportLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          )}

          {userReport && userReport.user && !userReportLoading && (
            <div className="mt-4 p-3 bg-teal-50 rounded-lg border border-teal-200">
              <p className="font-medium text-teal-800 mb-2">{userReport.user.name}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500">الفواتير</p>
                  <p className="font-bold text-gray-800">{userReport.totalInvoices}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">المبيعات</p>
                  <p className="font-bold text-gray-800"><CurrencyDisplay amount={userReport.totalSales} symbolSize={12} /></p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">صافي الربح</p>
                  <p className="font-bold text-teal-600"><CurrencyDisplay amount={userReport.totalProfit} symbolSize={12} /></p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Details Button */}
      {(startDate || endDate || selectedUserId) && (
        <Button
          onClick={fetchDetailedReport}
          disabled={detailedReportLoading}
          className="w-full h-12 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-medium"
        >
          {detailedReportLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <FileText className="h-5 w-5 ml-2" />
              عرض التفاصيل
            </>
          )}
        </Button>
      )}

      {/* Users Performance Table */}
      <Card className="shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-gray-500" />
            <span className="font-medium">أداء المستخدمين</span>
          </div>

          {users.length === 0 ? (
            <p className="text-center text-gray-400 py-4">لا توجد بيانات</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.totalInvoices} فاتورة</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800"><CurrencyDisplay amount={u.totalSales} symbolSize={12} /></p>
                    <p className="text-xs text-teal-600">+<CurrencyDisplay amount={u.totalProfit} symbolSize={10} /> ربح</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
