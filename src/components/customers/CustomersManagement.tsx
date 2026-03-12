'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Plus,
  User,
  Phone,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  X,
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CustomerDetailsPage } from './CustomerDetailsPage';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  totalDebt: number;
  totalPaid: number;
  balance: number;
}

// Format currency
const formatCurrency = (amount: number) => {
  if (amount === 0) return '0 ﷼';
  return new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' ﷼';
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
    
    // Check for duplicate name
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

      {/* Customer List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-10 w-10 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">لا يوجد عملاء</p>
          <p className="text-gray-400 text-sm mt-1">اضغط على زر الإضافة لإضافة عميل جديد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => (
            <Card 
              key={customer.id} 
              className="shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
              onClick={() => setSelectedCustomerId(customer.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{customer.name}</h3>
                      {customer.phone && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-left">
                      <p className={`text-sm font-bold ${customer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(customer.balance)}
                      </p>
                      {customer.balance > 0 && (
                        <p className="text-xs text-gray-400">مستحق</p>
                      )}
                    </div>
                    <ChevronLeft className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                
                {/* Balance Summary */}
                {(customer.totalDebt > 0 || customer.totalPaid > 0) && (
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-red-50 px-2 py-1 rounded-full">
                      <TrendingUp className="h-3 w-3 text-red-500" />
                      دين: {formatCurrency(customer.totalDebt)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-green-50 px-2 py-1 rounded-full">
                      <TrendingDown className="h-3 w-3 text-green-500" />
                      مدفوع: {formatCurrency(customer.totalPaid)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
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
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name Field */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    اسم العميل *
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="أدخل اسم العميل"
                    required
                    className="h-12 text-base border-gray-200 focus:border-teal-500 focus:ring-teal-100"
                    autoFocus
                  />
                </div>
                
                {/* Phone Field */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    رقم الهاتف
                  </Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="05xxxxxxxx"
                    className="h-12 text-base border-gray-200 focus:border-teal-500 focus:ring-teal-100"
                    type="tel"
                    dir="ltr"
                  />
                </div>
                
                {/* Notes Field */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    ملاحظات
                  </Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="ملاحظات إضافية (اختياري)"
                    className="border-gray-200 focus:border-teal-500 focus:ring-teal-100 resize-none"
                    rows={3}
                  />
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 pb-8">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !formData.name.trim()}
                    className="flex-1 h-12 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-base font-medium shadow-md disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 ml-2 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-5 w-5 ml-2" />
                        إضافة العميل
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 px-6 text-base border-gray-200"
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
