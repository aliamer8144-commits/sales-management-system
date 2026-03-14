'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Banknote, User, Phone, Calendar, TrendingUp, TrendingDown, DollarSign, ChevronUp, ChevronDown } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/saudi-riyal-symbol';

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

// Format date only
const formatDate = (dateStr: string) => {
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr));
};

export default function SharedStatementPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [statement, setStatement] = useState<SharedStatement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
                {statement.filterInfo.startDate && `من ${formatDate(statement.filterInfo.startDate)}`}
                {statement.filterInfo.endDate && ` إلى ${formatDate(statement.filterInfo.endDate)}`}
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
            </div>

            {statement.statement.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                لا توجد حركات في هذه الفترة
              </div>
            ) : (
              <div className="divide-y">
                {statement.statement.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="p-4 hover:bg-gray-50">
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
                          ) : item.type === 'invoice' ? (
                            <FileText className="h-5 w-5" />
                          ) : (
                            <Banknote className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-xs text-gray-500">
                            {item.type === 'previous' ? formatDate(item.date) : formatDateTime(item.date)}
                          </p>
                          {item.notes && (
                            <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>
                          )}
                        </div>
                      </div>
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
                    </div>
                  </div>
                ))}
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
          <p>تم إنشاء هذا الكشف بتاريخ: {formatDateTime(statement.generatedAt)}</p>
          <p className="mt-1">نظام إدارة المبيعات</p>
        </div>
      </div>
    </div>
  );
}
