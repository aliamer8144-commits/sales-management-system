'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShoppingCart, Package, Users, BarChart3, AlertTriangle, ShoppingBag, Wallet } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { CurrencyDisplay } from '@/components/ui/saudi-riyal-symbol';
import type { DashboardStats } from '@/types';

interface AdminDashboardProps {
  setCurrentView: (view: string) => void;
}

export function AdminDashboard({ setCurrentView }: AdminDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalProfit: 0,
    totalCapital: 0,
    totalCredit: 0,
  });
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch('/api/reports?type=summary').then((r) => r.json()),
      fetch('/api/reports?type=low-stock').then((r) => r.json()),
    ]).then(([statsData, lowStockData]) => {
      setStats(statsData);
      setLowStockCount(Array.isArray(lowStockData) ? lowStockData.length : 0);
    });
  }, []);

  return (
    <div className="p-4 space-y-6 pb-24">
      {lowStockCount > 0 && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <span className="font-medium">تنبيه: </span>يوجد {lowStockCount} منتج منخفض المخزون
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="إجمالي المبيعات"
          value={<CurrencyDisplay amount={stats.totalSales} symbolSize={14} />}
          icon={ShoppingCart}
        />
        <StatCard title="إجمالي الأرباح" value={<CurrencyDisplay amount={stats.totalProfit} symbolSize={14} />} icon={Package} />
        <StatCard title="رأس المال" value={<CurrencyDisplay amount={stats.totalCapital} symbolSize={14} />} icon={Wallet} />
        <StatCard
          title="الديون المستحقة"
          value={<CurrencyDisplay amount={stats.totalCredit} symbolSize={14} />}
          icon={Users}
          color="red"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          className="h-20 flex-col gap-2 bg-gradient-to-r from-teal-500 to-emerald-600"
          onClick={() => setCurrentView('new-invoice')}
        >
          <ShoppingCart className="h-6 w-6" />
          فاتورة مبيعات
        </Button>
        <Button
          className="h-20 flex-col gap-2 bg-gradient-to-r from-amber-500 to-orange-600"
          onClick={() => setCurrentView('new-purchase-invoice')}
        >
          <ShoppingBag className="h-6 w-6" />
          فاتورة مشتريات
        </Button>
        <Button
          className="h-20 flex-col gap-2 bg-gradient-to-r from-emerald-500 to-teal-600"
          onClick={() => setCurrentView('products')}
        >
          <Package className="h-6 w-6" />
          إدارة المنتجات
        </Button>
        <Button
          className="h-20 flex-col gap-2 bg-gradient-to-r from-teal-500 to-emerald-600"
          onClick={() => setCurrentView('customers')}
        >
          <Users className="h-6 w-6" />
          إدارة العملاء
        </Button>
        <Button
          className="h-20 flex-col gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 col-span-2"
          onClick={() => setCurrentView('reports')}
        >
          <BarChart3 className="h-6 w-6" />
          التقارير
        </Button>
      </div>
    </div>
  );
}
