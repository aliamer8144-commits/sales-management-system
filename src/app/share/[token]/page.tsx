'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, FileText, Banknote, User, Phone, Calendar, TrendingUp, TrendingDown, DollarSign, ChevronUp, ChevronDown, FilePlus } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/saudi-riyal-symbol';
import { formatYemenDateTime, formatYemenDate } from '@/lib/date-utils';

interface StatementItem {
  type: 'previous' | 'invoice' | 'payment';
  id: string;
  date: string;
  description: string;
  amount: number;
  userName: string;
  notes: string | null;
  invoiceType?: string;
}

interface SharedStatement {
  customer: {
    name: string;
    phone: string | null;
  };
  filterInfo: {
    startDate: string | null;
    endDate: string | null;
  };
  summary: {
    totalDebt: number;
    totalPaid: number;
    balance: number;
    previousBalance: number;
    invoicesCount: number;
    paymentsCount: number;
  };
  statement: StatementItem[];
  generatedAt: string;
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
  notes?: string;
  createdAt: string;
  customer?: { name: string } | null;
  user: { name: string };
  invoiceType?: string;
}

interface PaymentDetails {
  id: string;
  amount: number;
  notes?: string;
  createdAt: string;
  customer?: { name: string } | null;
  user: { name: string };
}

// Format date and time

// Format date only

export default function SharedStatementPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [statement, setStatement] = useState<SharedStatement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accordion state for transaction details
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);
  const [transactionDetails, setTransactionDetails] = useState<Record<string, InvoiceDetails | PaymentDetails>>({});
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatement = async () => {
      try {
        const res = await fetch(`/api/share/statement/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'حدث خطأ');
          return;
        }

        setStatement(data);
      } catch {
        setError('حدث خطأ في تحميل البيانات');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchStatement();
    }
  }, [token]);

  // Fetch transaction details
  const fetchTransactionDetails = async (transactionId: string, type: string) => {
    if (transactionDetails[transactionId]) {
      setExpandedTransactionId(expandedTransactionId === transactionId ? null : transactionId);
      return;
    }

    setLoadingDetails(transactionId);

    try {
      let endpoint = '';
      if (type === 'invoice') {
        endpoint = `/api/invoices/${transactionId}`;
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
    if (type === 'previous') return; // Don't expand previous balance
    
    if (expandedTransactionId === transactionId) {
      setExpandedTransactionId(null);
    } else {
      fetchTransactionDetails(transactionId, type);
    }
  };

  // Render transaction details (accordion content)
  const renderTransactionDetails = (transactionId: string, type: string) => {
    const details = transactionDetails[transactionId];
    const isLoading = loadingDetails === transactionId;

    if (isLoading) {
      return (
        <div className="flex justify-center py-4 bg-gray-50">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
        </div>
      );
    }

    if (!details) return null;

    if (type === 'payment') {
      const payment = details as PaymentDetails;
      return (
        <div className="p-4 bg-gray-50 border-t">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">المبلغ:</span>
              <span className="font-bold text-green-600"><CurrencyDisplay amount={payment.amount} symbolSize={12} /></span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">المستخدم:</span>
              <span>{payment.user?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">التاريخ:</span>
              <span>{formatYemenDateTime(payment.createdAt)}</span>
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
    const isManual = invoice.invoiceType === 'manual';

    if (isManual) {
      // Manual invoice - show simple details
      return (
        <div className="p-4 bg-gray-50 border-t">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">المبلغ:</span>
              <span className="font-bold text-red-600"><CurrencyDisplay amount={invoice.totalAmount} symbolSize={12} /></span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">المستخدم:</span>
              <span>{invoice.user?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">التاريخ:</span>
              <span>{formatYemenDateTime(invoice.createdAt)}</span>
            </div>
            {invoice.notes && (
              <div className="mt-2 p-2 bg-white rounded border text-sm">
                <span className="text-gray-500">السبب: </span>
                {invoice.notes}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Regular credit invoice - show items
    return (
      <div className="p-4 bg-gray-50 border-t">
        {/* User Info */}
        <div className="mb-3 text-sm">
          <span className="text-gray-500">المستخدم: </span>
          <span>{invoice.user?.name}</span>
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
        <div className="border-t pt-2">
          <div className="flex justify-between text-sm font-medium">
            <span>الإجمالي:</span>
            <span><CurrencyDisplay amount={invoice.totalAmount} symbolSize={12} /></span>
          </div>
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">خطأ</h2>
            <p className="text-gray-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!statement) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-l from-teal-600 to-emerald-600 text-white p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                <User className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{statement.customer.name}</h1>
                {statement.customer.phone && (
                  <p className="text-sm text-white/80 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {statement.customer.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Filter Info */}
          {(statement.filterInfo.startDate || statement.filterInfo.endDate) && (
            <div className="bg-white/10 rounded-lg p-3 flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span>
                {statement.filterInfo.startDate && `من ${formatYemenDateTime(statement.filterInfo.startDate)}`}
                {statement.filterInfo.endDate && ` إلى ${formatYemenDateTime(statement.filterInfo.endDate)}`}
              </span>
            </div>
          )}

          {/* Balance Cards */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-red-200" />
              <p className="text-xs text-white/70">إجمالي الدين</p>
              <p className="font-bold text-sm">
                <CurrencyDisplay amount={statement.summary.totalDebt} symbolSize={12} />
              </p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <TrendingDown className="h-5 w-5 mx-auto mb-1 text-green-200" />
              <p className="text-xs text-white/70">إجمالي المدفوع</p>
              <p className="font-bold text-sm">
                <CurrencyDisplay amount={statement.summary.totalPaid} symbolSize={12} />
              </p>
            </div>
            <div className={`rounded-xl p-3 text-center ${statement.summary.balance > 0 ? 'bg-red-500/40' : 'bg-green-500/40'}`}>
              <DollarSign className="h-5 w-5 mx-auto mb-1" />
              <p className="text-xs text-white/70">الرصيد</p>
              <p className="font-bold text-sm">
                <CurrencyDisplay amount={statement.summary.balance} symbolSize={12} />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Statement of Account */}
        <Card className="shadow-md">
          <CardContent className="p-0">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" />
                كشف الحساب
              </h2>
              <p className="text-xs text-gray-500 mt-1">اضغط على العملية لعرض التفاصيل</p>
            </div>

            {statement.statement.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                لا توجد حركات في هذه الفترة
              </div>
            ) : (
              <div className="divide-y">
                {statement.statement.map((item) => {
                  const isExpanded = expandedTransactionId === item.id;
                  const isLoading = loadingDetails === item.id;
                  const isClickable = item.type !== 'previous';
                  
                  return (
                    <div key={`${item.type}-${item.id}`} className="overflow-hidden">
                      {/* Transaction Header - Clickable */}
                      <div 
                        className={`p-4 transition-colors ${isClickable ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
                        onClick={() => isClickable && handleTransactionClick(item.id, item.type)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              item.type === 'previous'
                                ? 'bg-blue-100 text-blue-600'
                                : item.invoiceType === 'manual'
                                  ? 'bg-purple-100 text-purple-600'
                                  : item.type === 'invoice'
                                    ? 'bg-red-100 text-red-600'
                                    : 'bg-green-100 text-green-600'
                            }`}>
                              {item.type === 'previous' ? (
                                <DollarSign className="h-5 w-5" />
                              ) : item.invoiceType === 'manual' ? (
                                <FilePlus className="h-5 w-5" />
                              ) : item.type === 'invoice' ? (
                                <FileText className="h-5 w-5" />
                              ) : (
                                <Banknote className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{item.description}</p>
                              <p className="text-xs text-gray-500">
                                {item.type === 'previous' ? formatYemenDate(item.date) : formatYemenDateTime(item.date)}
                              </p>
                              {item.notes && item.type === 'previous' && (
                                <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-left">
                              <p className={`font-bold ${
                                item.amount > 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {item.amount > 0 ? '+' : ''}<CurrencyDisplay amount={item.amount} symbolSize={12} />
                              </p>
                              {item.userName && (
                                <p className="text-xs text-gray-400">{item.userName}</p>
                              )}
                            </div>
                            {isClickable && (
                              isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                              ) : isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Accordion Content - Details */}
                      {isExpanded && renderTransactionDetails(item.id, item.type)}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center">
              <FileText className="h-6 w-6 mx-auto mb-2 text-teal-600" />
              <p className="text-2xl font-bold text-gray-800">{statement.summary.invoicesCount}</p>
              <p className="text-xs text-gray-500">فاتورة</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center">
              <Banknote className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-gray-800">{statement.summary.paymentsCount}</p>
              <p className="text-xs text-gray-500">سند قبض</p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pt-4">
          <p>تم إنشاء هذا الكشف بتاريخ: {formatYemenDateTime(statement.generatedAt)}</p>
          <p className="mt-1">نظام إدارة المبيعات</p>
        </div>
      </div>
    </div>
  );
}
