'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowRight,
  Loader2,
  User,
  Phone,
  FileText,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  X,
  Trash2,
  AlertTriangle,
  FilePlus,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  totalDebt: number;
  totalPaid: number;
  balance: number;
}

interface StatementItem {
  type: 'invoice' | 'payment';
  id: string;
  date: string;
  description: string;
  amount: number;
  userName: string;
  notes: string | null;
  invoiceType?: string;
}

interface CustomerStatement {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    notes: string | null;
  };
  summary: {
    totalDebt: number;
    totalPaid: number;
    balance: number;
    invoicesCount: number;
    paymentsCount: number;
  };
  statement: StatementItem[];
}

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount)) + ' ﷼';
};

// Format date and time
const formatDateTime = (dateStr: string) => {
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
};

export function CustomerDetailsPage({ 
  customerId, 
  onBack,
  isAdmin = true
}: { 
  customerId: string; 
  onBack: () => void;
  isAdmin?: boolean;
}) {
  const user = useAuthStore((state) => state.user);
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showManualInvoiceForm, setShowManualInvoiceForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualInvoiceAmount, setManualInvoiceAmount] = useState('');
  const [manualInvoiceNotes, setManualInvoiceNotes] = useState('');
  
  // Date filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchStatement = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate + 'T23:59:59').toISOString());
      
      const data = await fetch(`/api/customers/${customerId}/statement?${params}`).then((r) => r.json());
      setStatement(data);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, startDate, endDate]);

  useEffect(() => {
    fetchStatement();
  }, [fetchStatement]);

  const handlePayment = async () => {
    if (!user?.id) {
      toast({ title: 'خطأ', description: 'يجب تسجيل الدخول', variant: 'destructive' });
      return;
    }
    
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast({ title: 'خطأ', description: 'أدخل مبلغ صحيح', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          amount,
          paymentMethod: 'cash',
          notes: paymentNotes,
          userId: user.id,
        }),
      });

      if (response.ok) {
        toast({ title: 'تم بنجاح', description: 'تم تسجيل القبض' });
        setShowPaymentForm(false);
        setPaymentAmount('');
        setPaymentNotes('');
        fetchStatement();
      } else {
        const error = await response.json();
        toast({ title: 'خطأ', description: error.error, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualInvoice = async () => {
    if (!user?.id) {
      toast({ title: 'خطأ', description: 'يجب تسجيل الدخول', variant: 'destructive' });
      return;
    }
    
    const amount = parseFloat(manualInvoiceAmount);
    if (!amount || amount <= 0) {
      toast({ title: 'خطأ', description: 'أدخل مبلغ صحيح', variant: 'destructive' });
      return;
    }

    if (!manualInvoiceNotes.trim()) {
      toast({ title: 'خطأ', description: 'يجب كتابة ملاحظة للفاتورة', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/invoices/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          amount,
          notes: manualInvoiceNotes,
          userId: user.id,
        }),
      });

      if (response.ok) {
        toast({ title: 'تم بنجاح', description: 'تم إضافة الفاتورة اليدوية' });
        setShowManualInvoiceForm(false);
        setManualInvoiceAmount('');
        setManualInvoiceNotes('');
        fetchStatement();
      } else {
        const error = await response.json();
        toast({ title: 'خطأ', description: error.error, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleDeleteCustomer = async () => {
    if (statement?.summary.balance && statement.summary.balance > 0) {
      toast({ 
        title: 'لا يمكن الحذف', 
        description: 'العميل لديه رصيد مستحق. يجب تسوية الحساب أولاً.',
        variant: 'destructive' 
      });
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: 'تم الحذف', description: 'تم حذف العميل بنجاح' });
        onBack();
      } else {
        const error = await response.json();
        toast({ title: 'خطأ', description: error.error, variant: 'destructive' });
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowRight className="h-5 w-5 ml-2" />
          رجوع
        </Button>
        <p className="text-center text-gray-500">العميل غير موجود</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-l from-teal-600 to-emerald-600 text-white p-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <ArrowRight className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{statement.customer.name}</h1>
            {statement.customer.phone && (
              <p className="text-sm text-white/80 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {statement.customer.phone}
              </p>
            )}
          </div>
          {isAdmin && (
            <button 
              onClick={() => setShowDeleteDialog(true)}
              className="p-2 hover:bg-red-500/50 rounded-full transition-colors"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <User className="h-6 w-6" />
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-red-200" />
            <p className="text-xs text-white/70">إجمالي الدين</p>
            <p className="font-bold text-sm">{formatCurrency(statement.summary.totalDebt)}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <TrendingDown className="h-5 w-5 mx-auto mb-1 text-green-200" />
            <p className="text-xs text-white/70">إجمالي المدفوع</p>
            <p className="font-bold text-sm">{formatCurrency(statement.summary.totalPaid)}</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${statement.summary.balance > 0 ? 'bg-red-500/40' : 'bg-green-500/40'}`}>
            <DollarSign className="h-5 w-5 mx-auto mb-1" />
            <p className="text-xs text-white/70">الرصيد</p>
            <p className="font-bold text-sm">{formatCurrency(statement.summary.balance)}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            className="h-12 bg-gradient-to-r from-green-500 to-emerald-600"
            onClick={() => setShowPaymentForm(true)}
          >
            <Banknote className="h-5 w-5 ml-2" />
            قبض من العميل
          </Button>
          {isAdmin && (
            <Button
              className="h-12 bg-gradient-to-r from-purple-500 to-indigo-600"
              onClick={() => setShowManualInvoiceForm(true)}
            >
              <FilePlus className="h-5 w-5 ml-2" />
              إضافة فاتورة
            </Button>
          )}
        </div>
        
        {/* Date Filter */}
        <Button
          variant="outline"
          className="w-full h-10 border-teal-500 text-teal-600"
          onClick={clearFilters}
        >
          <X className="h-4 w-4 ml-2" />
          مسح الفلاتر
        </Button>

        {/* Date Filter */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-600" />
              فلترة حسب التاريخ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500">من تاريخ</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">إلى تاريخ</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statement of Account */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-teal-600" />
              كشف الحساب
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {statement.statement.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                لا توجد حركات في هذه الفترة
              </div>
            ) : (
              <div className="divide-y">
                {statement.statement.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="p-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          item.invoiceType === 'manual' 
                            ? 'bg-purple-100 text-purple-600' 
                            : item.type === 'invoice' 
                              ? 'bg-red-100 text-red-600' 
                              : 'bg-green-100 text-green-600'
                        }`}>
                          {item.invoiceType === 'manual' ? (
                            <FilePlus className="h-5 w-5" />
                          ) : item.type === 'invoice' ? (
                            <FileText className="h-5 w-5" />
                          ) : (
                            <Banknote className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.description}</p>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(item.date)}
                          </p>
                          {item.notes && item.invoiceType !== 'manual' && (
                            <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={`font-bold ${
                          item.amount > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {item.amount > 0 ? '+' : '-'}{formatCurrency(item.amount)}
                        </p>
                        <p className="text-xs text-gray-400">{item.userName}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center">
              <FileText className="h-6 w-6 mx-auto mb-2 text-teal-600" />
              <p className="text-2xl font-bold text-gray-800">{statement.summary.invoicesCount}</p>
              <p className="text-xs text-gray-500">فاتورة آجلة</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center">
              <CreditCard className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-gray-800">{statement.summary.paymentsCount}</p>
              <p className="text-xs text-gray-500">عملية قبض</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-green-600" />
              قبض من العميل
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-teal-50 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-600">الرصيد المستحق</p>
              <p className="text-xl font-bold text-teal-600">{formatCurrency(statement.summary.balance)}</p>
            </div>
            
            <div>
              <Label>المبلغ *</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                className="h-12 text-lg"
                step="0.01"
              />
            </div>
            
            <div>
              <Label>ملاحظات</Label>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="ملاحظات (اختياري)..."
                rows={2}
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                className="flex-1 h-12 bg-gradient-to-r from-green-500 to-emerald-600"
                onClick={handlePayment}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 ml-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Banknote className="h-5 w-5 ml-2" />
                    تسجيل القبض
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="h-12"
                onClick={() => setShowPaymentForm(false)}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Invoice Dialog */}
      <Dialog open={showManualInvoiceForm} onOpenChange={setShowManualInvoiceForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus className="h-5 w-5 text-purple-600" />
              إضافة فاتورة يدوية
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-sm text-purple-700">
                هذه الفاتورة ستُضاف لحساب العميل دون التأثير على المبيعات أو الأرباح أو المخزون
              </p>
            </div>
            
            <div>
              <Label>المبلغ *</Label>
              <Input
                type="number"
                value={manualInvoiceAmount}
                onChange={(e) => setManualInvoiceAmount(e.target.value)}
                placeholder="0.00"
                className="h-12 text-lg"
                step="0.01"
              />
            </div>
            
            <div>
              <Label>الملاحظة *</Label>
              <Textarea
                value={manualInvoiceNotes}
                onChange={(e) => setManualInvoiceNotes(e.target.value)}
                placeholder="أدخل سبب أو وصف الفاتورة..."
                rows={3}
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                className="flex-1 h-12 bg-gradient-to-r from-purple-500 to-indigo-600"
                onClick={handleManualInvoice}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 ml-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <FilePlus className="h-5 w-5 ml-2" />
                    إضافة الفاتورة
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="h-12"
                onClick={() => setShowManualInvoiceForm(false)}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              تأكيد حذف العميل
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="font-bold text-red-700 mb-2">
                  هل أنت متأكد من حذف هذا العميل؟
                </p>
                <p className="text-sm text-red-600">
                  سيتم حذف جميع البيانات المتعلقة بهذا العميل بما في ذلك:
                </p>
                <ul className="text-sm text-red-600 mt-2 mr-4 list-disc">
                  <li>{statement.summary.invoicesCount} فاتورة آجلة</li>
                  <li>{statement.summary.paymentsCount} عملية قبض</li>
                </ul>
              </div>
              <p className="text-sm text-gray-500 font-medium">
                ⚠️ هذا الإجراء لا يمكن التراجع عنه!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-11">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              disabled={isDeleting}
              className="h-11 bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 ml-2" />
                  نعم، احذف
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
