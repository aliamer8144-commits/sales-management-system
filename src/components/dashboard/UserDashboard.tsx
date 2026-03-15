'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  Wallet,
  Plus,
  Banknote,
  UserPlus,
  BarChart3,
  FileText,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { CurrencyDisplay } from '@/components/ui/saudi-riyal-symbol';
import { formatYemenDateTime } from '@/lib/date-utils';

interface UserStats {
  totalSales: number;
  totalProfit: number;
  totalCredit: number;
  invoicesCount: number;
}

interface RecentInvoice {
  id: string;
  totalAmount: number;
  invoiceType: string;
  createdAt: string;
  customerName: string | null;
}

interface UserDashboardProps {
  setCurrentView: (view: string) => void;
}

export function UserDashboard({ setCurrentView }: UserDashboardProps) {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<UserStats>({
    totalSales: 0,
    totalProfit: 0,
    totalCredit: 0,
    invoicesCount: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch user stats
        const statsRes = await fetch(`/api/reports?type=user-report&userId=${user?.id}`);
        const statsData = await statsRes.json();
        
        // Fetch all credit (total debts from all users)
        const creditRes = await fetch('/api/reports');
        const creditData = await creditRes.json();
        
        setStats({
          totalSales: statsData.totalSales || 0,
          totalProfit: statsData.totalProfit || 0,
          totalCredit: creditData.totalCredit || 0,
          invoicesCount: statsData.totalInvoices || 0,
        });

        // Fetch recent invoices
        const invoicesRes = await fetch(`/api/invoices?userId=${user?.id}`);
        const invoicesData = await invoicesRes.json();
        setRecentInvoices(Array.isArray(invoicesData) ? invoicesData.slice(0, 5) : []);
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-800">مرحباً، {user?.name}</h1>
        <p className="text-sm text-gray-500">لوحة التحكم الخاصة بك</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="shadow-md border-0 overflow-hidden bg-gradient-to-br from-teal-500 to-emerald-600">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div className="text-white">
                <p className="text-xs text-white/80 mb-1">إجمالي مبيعاتي</p>
                <p className="font-bold text-base"><CurrencyDisplay amount={stats.totalSales} symbolSize={12} /></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-0 overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div className="text-white">
                <p className="text-xs text-white/80 mb-1">إجمالي الديون</p>
                <p className="font-bold text-base"><CurrencyDisplay amount={stats.totalCredit} symbolSize={12} /></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-teal-600" />
            إجراءات سريعة
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="h-16 flex-col gap-1 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
              onClick={() => setCurrentView('new-invoice')}
            >
              <Plus className="h-5 w-5" />
              <span className="text-xs">فاتورة مبيعات</span>
            </Button>

            <Button
              className="h-16 flex-col gap-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              onClick={() => setCurrentView('customers')}
            >
              <Banknote className="h-5 w-5" />
              <span className="text-xs">قبض من عميل</span>
            </Button>

            <Button
              className="h-16 flex-col gap-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
              onClick={() => setCurrentView('customers')}
            >
              <UserPlus className="h-5 w-5" />
              <span className="text-xs">إنشاء عميل</span>
            </Button>

            <Button
              className="h-16 flex-col gap-1 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
              onClick={() => setCurrentView('my-sales')}
            >
              <FileText className="h-5 w-5" />
              <span className="text-xs">فواتيري</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="h-4 w-4 text-teal-600" />
              آخر الفواتير
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-teal-600 hover:text-teal-700"
              onClick={() => setCurrentView('my-sales')}
            >
              عرض الكل
            </Button>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">لا توجد فواتير بعد</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                      <ShoppingCart className="h-4 w-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {invoice.customerName || 'عميل نقدي'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatYemenDateTime(invoice.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800">
                      <CurrencyDisplay amount={invoice.totalAmount} symbolSize={12} />
                    </p>
                    <Badge
                      className={`text-xs ${
                        invoice.invoiceType === 'cash'
                          ? 'bg-teal-100 text-teal-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {invoice.invoiceType === 'cash' ? 'نقد' : 'آجل'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="shadow-sm bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">عدد فواتيرك</p>
              <p className="text-2xl font-bold text-teal-600">{stats.invoicesCount}</p>
            </div>
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
              <FileText className="h-6 w-6 text-teal-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
