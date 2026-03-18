'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, Package, Users, BarChart3, AlertTriangle, ShoppingBag, Wallet,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { CurrencyDisplay } from '@/components/ui/saudi-riyal-symbol';
import type { DashboardStats, Product } from '@/types';

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
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [showLowStockList, setShowLowStockList] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/reports?type=summary').then((r) => r.json()),
      fetch('/api/reports?type=low-stock').then((r) => r.json()),
    ]).then(([statsData, lowStockData]) => {
      setStats(statsData);
      setLowStockProducts(Array.isArray(lowStockData) ? lowStockData : []);
    });
  }, []);

  const lowStockCount = lowStockProducts.length;

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Low Stock Alert - Clickable */}
      {lowStockCount > 0 && (
        <div className="space-y-2">
          <Alert 
            className="bg-amber-50 border-amber-200 cursor-pointer"
            onClick={() => setShowLowStockList(!showLowStockList)}
          >
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 flex items-center justify-between">
              <span>
                <span className="font-medium">تنبيه: </span>
                يوجد {lowStockCount} منتج منخفض المخزون
              </span>
              {showLowStockList ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </AlertDescription>
          </Alert>

          {/* Low Stock Products List */}
          {showLowStockList && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-3">
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {lowStockProducts.map((product) => {
                    const alertUnit = product.units.find(u => u.unitType === product.alertUnitType);
                    return (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-200"
                      >
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-gray-500">
                            الحد: {product.alertLimit} {alertUnit?.unitName || 'قطعة'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {product.units.map((unit, idx) => (
                            <Badge
                              key={unit.id || idx}
                              variant="outline"
                              className={`text-xs ${unit.stockQuantity <= (product.alertLimit || 5) ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50'}`}
                            >
                              {unit.unitName}: {unit.stockQuantity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={() => setCurrentView('products')}
                >
                  عرض كل المنتجات
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
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
