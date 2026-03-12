'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, User } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Settings } from 'lucide-react';

// Import modular components
import { LoginPage } from '@/components/auth/LoginPage';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { BottomNav } from '@/components/shared/BottomNav';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { UserDashboard } from '@/components/dashboard/UserDashboard';
import { ProductsManagement } from '@/components/products/ProductsManagement';
import { CustomersManagement } from '@/components/customers/CustomersManagement';
import { InvoicesList } from '@/components/invoices/InvoicesList';
import { CreateInvoicePage } from '@/components/invoices/CreateInvoicePage';
import { CreatePurchaseInvoicePage } from '@/components/invoices/CreatePurchaseInvoicePage';
import { ReportsPage } from '@/components/reports/ReportsPage';
import { SettingsPage } from '@/components/settings/SettingsPage';

// Header Component (small enough to keep here)
function Header({ user, onSettings, title }: { user: User; onSettings: () => void; title: string }) {
  return (
    <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b shadow-sm z-40">
      <div className="flex items-center justify-between px-4 h-14">
        <h1 className="text-lg font-bold text-gray-800">{title}</h1>
        <div className="flex items-center gap-2">
          <div className="text-left">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-gray-500">{user.role === 'admin' ? 'مدير' : 'مستخدم'}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onSettings} className="text-gray-400 hover:text-teal-500">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

// Main App
export default function App() {
  const { user, isAuthenticated, isLoading, checkAuth, logout } = useAuthStore();
  const [currentView, setCurrentView] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    checkAuth().then(() => setInitialized(true));
  }, [checkAuth]);

  const getDefaultView = useCallback(() => (user?.role === 'admin' ? 'dashboard' : 'user-dashboard'), [user?.role]);
  const currentDisplayView = currentView || (isAuthenticated ? getDefaultView() : '');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    logout();
    setCurrentView('');
  };

  if (isLoading || !initialized) return <LoadingScreen />;
  if (!isAuthenticated) return <LoginPage />;

  const isAdmin = user?.role === 'admin';
  const showFloatingButton = !['new-invoice', 'new-purchase-invoice', 'customers', 'reports', 'settings', 'user-dashboard', 'dashboard'].includes(currentDisplayView);

  const renderContent = () => {
    switch (currentDisplayView) {
      case 'dashboard':
        return <AdminDashboard setCurrentView={setCurrentView} />;
      case 'user-dashboard':
        return <UserDashboard setCurrentView={setCurrentView} />;
      case 'products':
        return <ProductsManagement />;
      case 'invoices':
        return <InvoicesList isAdmin={isAdmin} />;
      case 'my-sales':
        return <InvoicesList isAdmin={false} />;
      case 'new-invoice':
        return <CreateInvoicePage />;
      case 'new-purchase-invoice':
        return <CreatePurchaseInvoicePage />;
      case 'customers':
        return <CustomersManagement isAdmin={isAdmin} />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage onLogout={handleLogout} />;
      default:
        return isAdmin ? <AdminDashboard setCurrentView={setCurrentView} /> : <UserDashboard setCurrentView={setCurrentView} />;
    }
  };

  const getTitle = () => {
    switch (currentDisplayView) {
      case 'dashboard':
        return 'لوحة التحكم';
      case 'user-dashboard':
        return 'الرئيسية';
      case 'products':
        return 'إدارة المنتجات';
      case 'invoices':
        return 'الفواتير';
      case 'my-sales':
        return 'مبيعاتي';
      case 'new-invoice':
        return 'فاتورة مبيعات';
      case 'new-purchase-invoice':
        return 'فاتورة مشتريات';
      case 'customers':
        return 'إدارة العملاء';
      case 'reports':
        return 'التقارير';
      case 'settings':
        return 'الإعدادات';
      default:
        return 'نظام المبيعات';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user!} onSettings={() => setCurrentView('settings')} title={getTitle()} />
      <main className="flex-1">{renderContent()}</main>
      <BottomNav currentView={currentDisplayView} setCurrentView={setCurrentView} isAdmin={isAdmin} />
      {showFloatingButton && (
        <button
          onClick={() => setCurrentView('new-invoice')}
          className="fixed bottom-20 left-4 w-14 h-14 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-full shadow-lg flex items-center justify-center text-white z-40 active:scale-95"
        >
          <Plus className="h-7 w-7" />
        </button>
      )}
    </div>
  );
}
