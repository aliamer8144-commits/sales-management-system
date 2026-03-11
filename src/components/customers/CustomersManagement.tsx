'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Customer } from '@/types';

export function CustomersManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', notes: '' });

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
            <Card key={customer.id} className="shadow-sm">
              <CardContent className="p-4">
                <h3 className="font-semibold">{customer.name}</h3>
                {customer.phone && <p className="text-sm text-gray-500">{customer.phone}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
