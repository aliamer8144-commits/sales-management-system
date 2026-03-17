'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Plus,
  User,
  Phone,
  ChevronLeft,
  X,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  FileText,
  Banknote,
  Clock,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CustomerDetailsPage } from './CustomerDetailsPage';
import { CurrencyDisplay } from '@/components/ui/saudi-riyal-symbol';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  totalDebt: number;
  totalPaid: number;
  balance: number;
  lastInvoiceDate?: string;
  invoiceCount?: number;
  lastTransaction?: {
    type: 'invoice' | 'payment';
    date: string;
    amount: number;
  };
}

// Format relative time in Arabic
const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'الآن';
  if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays === 1) return 'أمس';
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
  if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} أشهر`;

  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

// Get balance status
const getBalanceStatus = (balance: number) => {
  if (balance > 0) {
    return {
      label: 'مدين',
      className: 'bg-gradient-to-l from-red-500 to-rose-600 text-white',
    };
  } else if (balance < 0) {
    return {
      label: 'دائن',
      className: 'bg-gradient-to-l from-emerald-500 to-teal-600 text-white',
    };
  }
  return {
    label: 'متصفّي',
    className: 'bg-gradient-to-l from-slate-400 to-slate-500 text-white',
  };
};

interface CustomersManagementProps {
  isAdmin?: boolean;
}

export function CustomersManagement({ isAdmin = true }: CustomersManagementProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', notes: '' });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const fetchCustomers = useCallback(async () => {
    try {
      const data = await fetch('/api/customers').then((r) => r.json());
      setCustomers(Array.isArray(data) ? data : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const duplicateName = customers.find(
      (c) => c.name.toLowerCase().trim() === formData.name.toLowerCase().trim()
    );
    
    if (duplicateName) {
      toast({ 
        title: 'اسم مكرر', 
        description: `يوجد عميل بنفس الاسم "${formData.name}". يرجى اختيار اسم آخر.`,
        variant: 'destructive' 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        toast({ title: 'تم الإضافة', description: 'تم إضافة العميل بنجاح' });
        setShowForm(false);
        setFormData({ name: '', phone: '', notes: '' });
        fetchCustomers();
      } else {
        const error = await response.json();
        toast({ title: 'خطأ', description: error.error, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter customers by search
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // Show customer details if selected
  if (selectedCustomerId) {
    return (
      <CustomerDetailsPage
        customerId={selectedCustomerId}
        onBack={() => {
          setSelectedCustomerId(null);
          fetchCustomers();
        }}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <div className="p-4 pb-28 min-h-screen">
      {/* Page Title */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">العملاء</h1>
        <p className="text-sm text-gray-500">إدارة بيانات العملاء والحسابات</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 bg-slate-50 rounded-xl">
          <div className="text-2xl font-bold text-gray-800">{customers.length}</div>
          <p className="text-xs text-gray-500">عميل</p>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-xl">
          <div className="text-2xl font-bold text-red-600">
            <CurrencyDisplay amount={customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0)} />
          </div>
          <p className="text-xs text-gray-500">الديون المستحقة</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-xl">
          <div className="text-2xl font-bold text-green-600">
            <CurrencyDisplay amount={customers.reduce((sum, c) => sum + c.totalPaid, 0)} />
          </div>
          <p className="text-xs text-gray-500">إجمالي المدفوعات</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          placeholder="البحث عن عميل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10 h-12"
        />
      </div>

      {/* Customers List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-10 w-10 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">لا يوجد عملاء</p>
          <p className="text-gray-400 text-sm mt-1">اضغط على زر الإضافة لإضافة عميل جديد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((customer) => {
            const status = getBalanceStatus(customer.balance);
            return (
              <Card 
                key={customer.id}
                className="group relative overflow-hidden cursor-pointer transition-all hover:shadow-lg active:scale-[0.98] border border-slate-200/80"
                onClick={() => setSelectedCustomerId(customer.id)}
              >
                {/* Accent line */}
                <div className={`absolute top-0 right-0 left-0 h-0.5 opacity-60 group-hover:opacity-100 transition-opacity ${
                  customer.balance > 0 
                    ? 'bg-gradient-to-l from-amber-400 via-orange-400 to-orange-300' 
                    : customer.balance < 0 
                      ? 'bg-gradient-to-l from-teal-400 via-emerald-400 to-emerald-300'
                      : 'bg-gradient-to-l from-slate-300 via-slate-200 to-slate-200'
                }`} />
                
                <CardContent className="p-3 pb-2">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0 ${
                      customer.balance > 0
                        ? 'bg-gradient-to-bl from-amber-500 to-orange-600'
                        : customer.balance < 0
                          ? 'bg-gradient-to-bl from-teal-500 to-emerald-600'
                          : 'bg-gradient-to-bl from-slate-400 to-slate-500'
                    }`}>
                      {customer.name.charAt(0)}
                    </div>

                    {/* Name & Phone */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm truncate">{customer.name}</h3>
                      {customer.phone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </p>
                      )}
                    </div>

                    {/* Financial Info */}
                    <div className="hidden sm:flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1 text-red-600">
                        <CreditCard className="h-3 w-3" />
                        <CurrencyDisplay amount={customer.totalDebt} symbolSize={12} />
                      </div>
                      <span className="text-gray-300">/</span>
                      <div className="flex items-center gap-1 text-green-600">
                        <Wallet className="h-3 w-3" />
                        <CurrencyDisplay amount={customer.totalPaid} symbolSize={12} />
                      </div>
                    </div>

                    {/* Status Badge */}
                    <Badge className={`${status.className} gap-1 px-2 py-0.5 text-xs font-medium shadow-sm shrink-0`}>
                      {customer.balance !== 0 && (
                        <CurrencyDisplay amount={Math.abs(customer.balance)} symbolSize={12} />
                      )}
                      <span>{status.label}</span>
                    </Badge>

                    {/* Arrow */}
                    <ChevronLeft className="h-4 w-4 text-gray-300 group-hover:text-gray-400 transition-colors" />
                  </div>

                  {/* Last Transaction - Full Width */}
                  {customer.lastTransaction && (
                    <div className={`mt-2 pt-2 border-t border-dashed ${
                      customer.balance > 0
                        ? 'border-orange-200/60'
                        : customer.balance < 0
                          ? 'border-emerald-200/60'
                          : 'border-slate-200/60'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            customer.lastTransaction.type === 'payment'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            {customer.lastTransaction.type === 'payment' ? (
                              <Banknote className="h-3.5 w-3.5" />
                            ) : (
                              <FileText className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            آخر عملية: <span className={`font-medium ${
                              customer.lastTransaction.type === 'payment' ? 'text-green-600' : 'text-blue-600'
                            }`}>{customer.lastTransaction.type === 'payment' ? 'قبض' : 'فاتورة'}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-semibold text-sm ${
                            customer.lastTransaction.type === 'payment' ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            <CurrencyDisplay amount={customer.lastTransaction.amount} symbolSize={12} />
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(customer.lastTransaction.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Floating Add Button */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40
                   flex items-center gap-2 px-5 py-3 
                   bg-gradient-to-r from-teal-500 to-emerald-600 
                   text-white font-medium rounded-full shadow-lg 
                   hover:shadow-xl hover:scale-105 active:scale-95 
                   transition-all duration-200"
      >
        <Plus className="h-5 w-5" />
        إضافة عميل
      </button>

      {/* Add Customer Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <Card className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <CardHeader className="bg-gradient-to-l from-teal-500 to-emerald-600 text-white -m-6 mb-0 p-6 pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">إضافة عميل جديد</CardTitle>
                </div>
                <button 
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            
            {/* Form Content */}
            <CardContent className="p-6 pt-8 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    اسم العميل *
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="أدخل اسم العميل"
                    required
                    className="h-11 text-base border-gray-200"
                    autoFocus
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    رقم الهاتف
                  </Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="05xxxxxxxx"
                    className="h-11 text-base border-gray-200"
                    type="tel"
                    dir="ltr"
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    ملاحظات
                  </Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="ملاحظات إضافية (اختياري)"
                    className="border-gray-200 resize-none"
                    rows={2}
                  />
                </div>
                
                <div className="flex gap-3 pt-3 pb-16">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !formData.name.trim()}
                    className="flex-1 h-11 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-base font-medium shadow-md disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 ml-2" />
                        إضافة العميل
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 px-5 text-base border-gray-200"
                    onClick={() => {
                      setShowForm(false);
                      setFormData({ name: '', phone: '', notes: '' });
                    }}
                    disabled={isSubmitting}
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
