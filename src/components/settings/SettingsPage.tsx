'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  LogOut,
  User,
  Users,
  Plus,
  Pencil,
  Trash2,
  Save,
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

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
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

  return (
    <div className="p-4 pb-24 space-y-6">
      {/* Profile Section */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
            <User className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <p className="font-medium text-gray-800">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
            <p className="text-xs text-teal-600">{isAdmin ? 'مدير' : 'مستخدم'}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-500">الاسم</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleUpdateName}
                disabled={isSavingName}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {isSavingName ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Users Management (Admin Only) */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-600" />
              <h3 className="font-medium text-gray-800">إدارة المستخدمين</h3>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddUser(true)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="h-4 w-4 ml-1" />
              إضافة
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                    <p className={`text-xs ${u.role === 'admin' ? 'text-teal-600' : 'text-gray-400'}`}>
                      {u.role === 'admin' ? 'مدير' : 'مستخدم'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditUser(u)}
                      className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {u.id !== user?.id && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Logout Button */}
      <Button
        variant="outline"
        className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50"
        onClick={onLogout}
      >
        <LogOut className="h-4 w-4 ml-2" />
        تسجيل الخروج
      </Button>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة مستخدم جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>الاسم</Label>
              <Input
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="اسم المستخدم"
                className="mt-1"
              />
            </div>
            <div>
              <Label>البريد الإلكتروني</Label>
              <Input
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="email@example.com"
                className="mt-1"
                type="email"
              />
            </div>
            <div>
              <Label>كلمة المرور</Label>
              <Input
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="********"
                className="mt-1"
                type="password"
              />
            </div>
            <div>
              <Label>الصلاحية</Label>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setNewUserRole('user')}
                  className={`flex-1 py-2 rounded-lg border text-sm ${
                    newUserRole === 'user'
                      ? 'bg-teal-50 border-teal-500 text-teal-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  مستخدم
                </button>
                <button
                  onClick={() => setNewUserRole('admin')}
                  className={`flex-1 py-2 rounded-lg border text-sm ${
                    newUserRole === 'admin'
                      ? 'bg-teal-50 border-teal-500 text-teal-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  مدير
                </button>
              </div>
            </div>
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700"
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل المستخدم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>الاسم</Label>
              <Input
                value={editUserName}
                onChange={(e) => setEditUserName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>البريد الإلكتروني</Label>
              <Input
                value={editUserEmail}
                onChange={(e) => setEditUserEmail(e.target.value)}
                className="mt-1"
                type="email"
              />
            </div>
            <div>
              <Label>كلمة المرور الجديدة (اختياري)</Label>
              <Input
                value={editUserPassword}
                onChange={(e) => setEditUserPassword(e.target.value)}
                placeholder="اتركه فارغاً للإبقاء على كلمة المرور الحالية"
                className="mt-1"
                type="password"
              />
            </div>
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700"
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
    </div>
  );
}
