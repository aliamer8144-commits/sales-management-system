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
  DollarSign,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
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

export function CustomersManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', notes: '' });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

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
    await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    toast({ title: 'تم الإضافة' });
    setShowForm(false);
    setFormData({ name: '', phone: '', notes: '' });
    fetchCustomers();
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
      />
    );
  }

  return (
    <div className="p-4 pb-24">
      <Button
        className="w-full h-12 mb-4 bg-gradient-to-r from-teal-500 to-emerald-600"
        onClick={() => setShowForm(true)}
      >
        <Plus className="h-5 w-5 ml-2" />
        إضافة عميل
      </Button>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <Card className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl">
            <CardHeader>
              <CardTitle>إضافة عميل جديد</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>الاسم *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="h-12"
                  />
                </div>
                <div>
                  <Label>رقم الهاتف</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div>
                  <Label>ملاحظات</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    className="flex-1 h-12 bg-gradient-to-r from-teal-500 to-emerald-600"
                  >
                    إضافة
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={() => setShowForm(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">لا يوجد عملاء</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => (
            <Card 
              key={customer.id} 
              className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedCustomerId(customer.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{customer.name}</h3>
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
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <TrendingUp className="h-3 w-3 text-red-500" />
                      دين: {formatCurrency(customer.totalDebt)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
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
    </div>
  );
}
