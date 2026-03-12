'use client';

import { Home, Package, FileText, Users, BarChart3, Plus } from 'lucide-react';

interface BottomNavProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isAdmin: boolean;
}

export function BottomNav({ currentView, setCurrentView, isAdmin }: BottomNavProps) {
  const navItems = isAdmin ? [
    { id: 'dashboard', label: 'الرئيسية', icon: Home },
    { id: 'products', label: 'المنتجات', icon: Package },
    { id: 'invoices', label: 'الفواتير', icon: FileText },
    { id: 'customers', label: 'العملاء', icon: Users },
    { id: 'reports', label: 'التقارير', icon: BarChart3 },
  ] : [
    { id: 'user-dashboard', label: 'الرئيسية', icon: Home },
    { id: 'new-invoice', label: 'فاتورة', icon: Plus },
    { id: 'my-sales', label: 'مبيعاتي', icon: FileText },
    { id: 'customers', label: 'العملاء', icon: Users },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              currentView === item.id ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
