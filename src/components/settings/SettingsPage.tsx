'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Loader2,
  LogOut,
  User,
  Users,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  ShieldAlert,
  AlertTriangle,
  FileX,
  Skull,
  Bomb,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface SettingsPageProps {
  onLogout: () => void;
}

export function SettingsPage({ onLogout }: SettingsPageProps) {
  const { user, setUser } = useAuthStore();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Edit profile state
  const [editName, setEditName] = useState(user?.name || '');
  const [isSavingName, setIsSavingName] = useState(false);

  // Add user dialog
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Edit user dialog
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Danger zone state
  const [showDeleteSalesInvoices, setShowDeleteSalesInvoices] = useState(false);
  const [showDeletePurchaseInvoices, setShowDeletePurchaseInvoices] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [invoicesCount, setInvoicesCount] = useState({ sales: 0, purchase: 0 });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchInvoicesCount();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvoicesCount = async () => {
    try {
      const [salesRes, purchaseRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/purchase-invoices'),
      ]);
      const salesData = await salesRes.json();
      const purchaseData = await purchaseRes.json();
      setInvoicesCount({
        sales: Array.isArray(salesData) ? salesData.length : 0,
        purchase: Array.isArray(purchaseData) ? purchaseData.length : 0,
      });
    } catch (error) {
      console.error('Error fetching invoices count:', error);
    }
  };

  // Update current user's name
  const handleUpdateName = async () => {
    if (!editName.trim()) {
      toast({ title: 'خطأ', description: 'الاسم مطلوب', variant: 'destructive' });
      return;
    }

    setIsSavingName(true);
    try {
      const res = await fetch(`/api/users/${user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUser({ ...user!, name: updatedUser.name });
        toast({ title: 'تم بنجاح', description: 'تم تحديث الاسم' });
      } else {
        const error = await res.json();
        toast({ title: 'خطأ', description: error.error, variant: 'destructive' });
      }
    } finally {
      setIsSavingName(false);
    }
  };

  // Add new user
  const handleAddUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      toast({ title: 'خطأ', description: 'جميع الحقول مطلوبة', variant: 'destructive' });
      return;
    }

    setIsAddingUser(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
        }),
      });

      if (res.ok) {
        toast({ title: 'تم بنجاح', description: 'تم إضافة المستخدم' });
        setShowAddUser(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('user');
        fetchUsers();
      } else {
        const error = await res.json();
        toast({ title: 'خطأ', description: error.error, variant: 'destructive' });
      }
    } finally {
      setIsAddingUser(false);
    }
  };

  // Open edit user dialog
  const openEditUser = (userData: UserData) => {
    setEditingUser(userData);
    setEditUserName(userData.name);
    setEditUserEmail(userData.email);
    setEditUserPassword('');
    setShowEditUser(true);
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!editingUser) return;

    if (!editUserName.trim() || !editUserEmail.trim()) {
      toast({ title: 'خطأ', description: 'الاسم والبريد مطلوبان', variant: 'destructive' });
      return;
    }

    setIsUpdatingUser(true);
    try {
      const body: { name: string; email: string; password?: string } = {
        name: editUserName,
        email: editUserEmail,
      };

      if (editUserPassword.trim()) {
        body.password = editUserPassword;
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast({ title: 'تم بنجاح', description: 'تم تحديث المستخدم' });
        setShowEditUser(false);
        setEditingUser(null);
        fetchUsers();
      } else {
        const error = await res.json();
        toast({ title: 'خطأ', description: error.error, variant: 'destructive' });
      }
    } finally {
      setIsUpdatingUser(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.id) {
      toast({ title: 'خطأ', description: 'لا يمكنك حذف حسابك الخاص', variant: 'destructive' });
      return;
    }

    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast({ title: 'تم بنجاح', description: 'تم حذف المستخدم' });
        fetchUsers();
      } else {
        const error = await res.json();
        toast({ title: 'خطأ', description: error.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    }
  };

  // Delete all sales invoices
  const handleDeleteSalesInvoices = async () => {
    if (deleteConfirmation !== 'حذف جميع فواتير المبيعات') {
      toast({ title: 'خطأ', description: 'النص غير مطابق', variant: 'destructive' });
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'DELETE',
      });

      if (res.ok) {
        toast({ title: 'تم الحذف', description: 'تم حذف جميع فواتير المبيعات نهائياً' });
        setShowDeleteSalesInvoices(false);
        setDeleteConfirmation('');
        fetchInvoicesCount();
      } else {
        const error = await res.json();
        toast({ title: 'خطأ', description: error.error, variant: 'destructive' });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete all purchase invoices
  const handleDeletePurchaseInvoices = async () => {
    if (deleteConfirmation !== 'حذف جميع فواتير المشتريات') {
      toast({ title: 'خطأ', description: 'النص غير مطابق', variant: 'destructive' });
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch('/api/purchase-invoices', {
        method: 'DELETE',
      });

      if (res.ok) {
        toast({ title: 'تم الحذف', description: 'تم حذف جميع فواتير المشتريات نهائياً' });
        setShowDeletePurchaseInvoices(false);
        setDeleteConfirmation('');
        fetchInvoicesCount();
      } else {
        const error = await res.json();
        toast({ title: 'خطأ', description: error.error, variant: 'destructive' });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 pb-28 space-y-6 min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-800">الإعدادات</h1>
        <p className="text-sm text-gray-500">إدارة الحساب وإعدادات النظام</p>
      </div>

      {/* Profile Section */}
      <Card className="shadow-sm border-0 overflow-hidden">
        <div className="bg-gradient-to-l from-teal-500 to-emerald-600 p-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <User className="h-7 w-7 text-white" />
            </div>
            <div className="text-white">
              <p className="font-bold text-lg">{user?.name}</p>
              <p className="text-sm text-white/80">{user?.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {isAdmin ? 'مدير النظام' : 'مستخدم'}
              </span>
            </div>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">تعديل الاسم</Label>
            <div className="flex gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 h-11 border-gray-200"
                placeholder="اسم المستخدم"
              />
              <Button
                onClick={handleUpdateName}
                disabled={isSavingName || editName === user?.name}
                className="h-11 px-4 bg-teal-600 hover:bg-teal-700"
              >
                {isSavingName ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Management (Admin Only) */}
      {isAdmin && (
        <Card className="shadow-sm border-0">
          <CardHeader className="bg-gray-100 border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-base font-semibold text-gray-800">إدارة المستخدمين</CardTitle>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddUser(true)}
                className="bg-teal-600 hover:bg-teal-700 h-9"
              >
                <Plus className="h-4 w-4 ml-1" />
                إضافة
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        u.role === 'admin' 
                          ? 'bg-teal-100 text-teal-700' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {u.role === 'admin' ? 'مدير' : 'مستخدم'}
                      </span>
                      <button
                        onClick={() => openEditUser(u)}
                        className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Danger Zone (Admin Only) */}
      {isAdmin && (
        <Card className="shadow-sm border-2 border-red-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Skull className="h-5 w-5 text-white" />
              </div>
              <div className="text-white">
                <CardTitle className="text-base font-bold">منطقة الخطر</CardTitle>
                <p className="text-xs text-white/80">إجراءات خطيرة - توخّ الحذر!</p>
              </div>
            </div>
          </div>
          <CardContent className="p-4 space-y-4 bg-red-50/50">
            {/* Delete Sales Invoices */}
            <div className="bg-white rounded-xl p-4 border border-red-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileX className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">حذف فواتير المبيعات</h4>
                  <p className="text-sm text-gray-500 mt-0.5">
                    حذف جميع فواتير المبيعات نهائياً ({invoicesCount.sales} فاتورة)
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    ⚠️ سيتم إعادة المخزون للمنتجات المحذوفة
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => setShowDeleteSalesInvoices(true)}
                  >
                    <Trash2 className="h-4 w-4 ml-1" />
                    حذف الكل
                  </Button>
                </div>
              </div>
            </div>

            {/* Delete Purchase Invoices */}
            <div className="bg-white rounded-xl p-4 border border-red-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileX className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">حذف فواتير المشتريات</h4>
                  <p className="text-sm text-gray-500 mt-0.5">
                    حذف جميع فواتير المشتريات نهائياً ({invoicesCount.purchase} فاتورة)
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    ⚠️ سيتم خصم المخزون من المنتجات المضافة
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => setShowDeletePurchaseInvoices(true)}
                  >
                    <Trash2 className="h-4 w-4 ml-1" />
                    حذف الكل
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logout Button */}
      <Button
        variant="outline"
        className="w-full h-12 border-gray-300 text-gray-600 hover:bg-gray-100"
        onClick={onLogout}
      >
        <LogOut className="h-4 w-4 ml-2" />
        تسجيل الخروج
      </Button>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader className="bg-gradient-to-l from-teal-500 to-emerald-600 -mx-6 -mt-6 px-6 py-4 rounded-t-2xl">
            <DialogTitle className="text-white flex items-center gap-2">
              <User className="h-5 w-5" />
              إضافة مستخدم جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-6">
            <div>
              <Label className="text-sm font-medium">الاسم</Label>
              <Input
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="اسم المستخدم"
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">البريد الإلكتروني</Label>
              <Input
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="email@example.com"
                className="mt-1.5 h-11"
                type="email"
                dir="ltr"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">كلمة المرور</Label>
              <Input
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="********"
                className="mt-1.5 h-11"
                type="password"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">الصلاحية</Label>
              <div className="flex gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setNewUserRole('user')}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    newUserRole === 'user'
                      ? 'bg-teal-50 border-teal-500 text-teal-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  مستخدم
                </button>
                <button
                  type="button"
                  onClick={() => setNewUserRole('admin')}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    newUserRole === 'admin'
                      ? 'bg-teal-50 border-teal-500 text-teal-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  مدير
                </button>
              </div>
            </div>
            <Button
              className="w-full h-11 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
              onClick={handleAddUser}
              disabled={isAddingUser}
            >
              {isAddingUser ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الإضافة...
                </>
              ) : (
                'إضافة المستخدم'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader className="bg-gradient-to-l from-teal-500 to-emerald-600 -mx-6 -mt-6 px-6 py-4 rounded-t-2xl">
            <DialogTitle className="text-white flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              تعديل المستخدم
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-6">
            <div>
              <Label className="text-sm font-medium">الاسم</Label>
              <Input
                value={editUserName}
                onChange={(e) => setEditUserName(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">البريد الإلكتروني</Label>
              <Input
                value={editUserEmail}
                onChange={(e) => setEditUserEmail(e.target.value)}
                className="mt-1.5 h-11"
                type="email"
                dir="ltr"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">كلمة المرور الجديدة (اختياري)</Label>
              <Input
                value={editUserPassword}
                onChange={(e) => setEditUserPassword(e.target.value)}
                placeholder="اتركه فارغاً للإبقاء على كلمة المرور الحالية"
                className="mt-1.5 h-11"
                type="password"
              />
            </div>
            <Button
              className="w-full h-11 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
              onClick={handleUpdateUser}
              disabled={isUpdatingUser}
            >
              {isUpdatingUser ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                'حفظ التغييرات'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Sales Invoices Confirmation */}
      <AlertDialog open={showDeleteSalesInvoices} onOpenChange={setShowDeleteSalesInvoices}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                <Bomb className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-xl text-red-600">
              ⚠️ تحذير خطير جداً!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-3">
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mt-4">
                <p className="font-bold text-red-700 text-lg">
                  أنت على وشك حذف {invoicesCount.sales} فاتورة مبيعات
                </p>
                <p className="text-red-600 text-sm mt-2">
                  هذا الإجراء سيحذف جميع البيانات نهائياً ولا يمكن التراجع عنه!
                </p>
              </div>
              <div className="bg-gray-100 rounded-lg p-3 mt-4">
                <p className="text-sm text-gray-600 mb-2">
                  اكتب "<span className="font-bold text-red-600">حذف جميع فواتير المبيعات</span>" للتأكيد:
                </p>
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="اكتب النص هنا..."
                  className="h-11 text-center"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel 
              className="flex-1 h-11"
              onClick={() => setDeleteConfirmation('')}
            >
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSalesInvoices}
              disabled={isDeleting || deleteConfirmation !== 'حذف جميع فواتير المبيعات'}
              className="flex-1 h-11 bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 ml-2" />
                  نعم، احذف نهائياً
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Purchase Invoices Confirmation */}
      <AlertDialog open={showDeletePurchaseInvoices} onOpenChange={setShowDeletePurchaseInvoices}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                <Bomb className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-xl text-red-600">
              ⚠️ تحذير خطير جداً!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-3">
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mt-4">
                <p className="font-bold text-red-700 text-lg">
                  أنت على وشك حذف {invoicesCount.purchase} فاتورة مشتريات
                </p>
                <p className="text-red-600 text-sm mt-2">
                  هذا الإجراء سيحذف جميع البيانات نهائياً ولا يمكن التراجع عنه!
                </p>
              </div>
              <div className="bg-gray-100 rounded-lg p-3 mt-4">
                <p className="text-sm text-gray-600 mb-2">
                  اكتب "<span className="font-bold text-red-600">حذف جميع فواتير المشتريات</span>" للتأكيد:
                </p>
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="اكتب النص هنا..."
                  className="h-11 text-center"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel 
              className="flex-1 h-11"
              onClick={() => setDeleteConfirmation('')}
            >
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePurchaseInvoices}
              disabled={isDeleting || deleteConfirmation !== 'حذف جميع فواتير المشتريات'}
              className="flex-1 h-11 bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 ml-2" />
                  نعم، احذف نهائياً
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
