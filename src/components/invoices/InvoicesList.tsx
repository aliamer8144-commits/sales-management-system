'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, FileText, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import type { Invoice } from '@/types';

interface InvoicesListProps {
  isAdmin: boolean;
}

export function InvoicesList({ isAdmin }: InvoicesListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const url = isAdmin ? '/api/invoices' : `/api/invoices?userId=${user?.id}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => setInvoices(Array.isArray(data) ? data : []))
      .finally(() => setIsLoading(false));
  }, [isAdmin, user?.id]);

  if (selectedInvoice) {
    return (
      <div className="p-4 pb-24">
        <Button variant="ghost" onClick={() => setSelectedInvoice(null)} className="mb-4">
          <ChevronLeft className="h-5 w-5 ml-1" />
          العودة
        </Button>
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>تفاصيل الفاتورة</CardTitle>
              <Badge variant={selectedInvoice.invoiceType === 'cash' ? 'default' : 'secondary'}>
                {selectedInvoice.invoiceType === 'cash' ? 'نقد' : 'آجل'}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              {new Date(selectedInvoice.createdAt).toLocaleDateString('ar-SA')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">المستخدم</p>
                  <p className="font-medium">{selectedInvoice.user.name}</p>
                </div>
                {selectedInvoice.customer && (
                  <div>
                    <p className="text-gray-500">العميل</p>
                    <p className="font-medium">{selectedInvoice.customer.name}</p>
                  </div>
                )}
              </div>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold">المنتجات</h4>
                {selectedInvoice.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-gray-500">
                        {item.quantity} {item.unitName} × {item.salePrice.toLocaleString()} ﷼
                      </p>
                    </div>
                    <p className="font-bold">{(item.quantity * item.salePrice).toLocaleString()} ﷼</p>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-gray-500">الإجمالي</span>
                <span className="font-bold">{selectedInvoice.totalAmount.toLocaleString()} ﷼</span>
              </div>
              {isAdmin && (
                <div className="flex justify-between">
                  <span className="text-gray-500">الربح</span>
                  <span className="font-bold text-green-600">
                    {selectedInvoice.totalProfit.toLocaleString()} ﷼
                  </span>
                </div>
              )}
              {selectedInvoice.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-gray-500 text-sm mb-1">ملاحظات</p>
                    <p className="bg-gray-50 p-3 rounded-lg text-sm">{selectedInvoice.notes}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">لا توجد فواتير</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <Card
              key={invoice.id}
              className="shadow-sm cursor-pointer hover:shadow-md"
              onClick={() => setSelectedInvoice(invoice)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {isAdmin ? invoice.user.name : `فاتورة #${invoice.id.slice(-6)}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(invoice.createdAt).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold">{invoice.totalAmount.toLocaleString()} ﷼</p>
                    <Badge
                      variant={invoice.invoiceType === 'cash' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {invoice.invoiceType === 'cash' ? 'نقد' : 'آجل'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
