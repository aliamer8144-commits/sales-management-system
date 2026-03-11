'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Loader2, Users, User, DollarSign, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';

interface UserStats {
  id: string;
  name: string;
  totalInvoices: number;
  totalSales: number;
  totalProfit: number;
}

interface UserReport {
  user: { id: string; name: string; email: string } | null;
  totalInvoices: number;
  totalSales: number;
  totalProfit: number;
}

export function ReportsPage() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProfit: 0,
    totalInvoices: 0,
    totalCredit: 0,
    totalCapital: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  // Users for reports
  const [users, setUsers] = useState<UserStats[]>([]);
  
  // Selected user report
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userReport, setUserReport] = useState<UserReport | null>(null);
  const [userReportLoading, setUserReportLoading] = useState(false);

  // Fetch summary stats
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const startDateTime = startDate && startTime ? `${startDate} ${startTime}` : startDate;
      const endDateTime = endDate && endTime ? `${endDate} ${endTime}` : endDate;
      
      const params = new URLSearchParams();
      if (startDateTime) params.append('startDateTime', startDateTime);
      if (endDateTime) params.append('endDateTime', endDateTime);
      
      try {
        const res = await fetch(`/api/reports?${params.toString()}`);
        const data = await res.json();
        setStats(data);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [startDate, endDate, startTime, endTime]);

  // Fetch users stats
  useEffect(() => {
    const fetchUsers = async () => {
      const startDateTime = startDate && startTime ? `${startDate} ${startTime}` : startDate;
      const endDateTime = endDate && endTime ? `${endDate} ${endTime}` : endDate;
      
      const params = new URLSearchParams({ type: 'users' });
      if (startDateTime) params.append('startDateTime', startDateTime);
      if (endDateTime) params.append('endDateTime', endDateTime);
      
      try {
        const res = await fetch(`/api/reports?${params.toString()}`);
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (e) {
        setUsers([]);
      }
    };
    
    fetchUsers();
  }, [startDate, endDate, startTime, endTime]);

  // Fetch selected user report
  useEffect(() => {
    const fetchUserReport = async () => {
      if (!selectedUserId) {
        setUserReport(null);
        return;
      }
      
      setUserReportLoading(true);
      const startDateTime = startDate && startTime ? `${startDate} ${startTime}` : startDate;
      const endDateTime = endDate && endTime ? `${endDate} ${endTime}` : endDate;
      
      const params = new URLSearchParams({ type: 'user-report', userId: selectedUserId });
      if (startDateTime) params.append('startDateTime', startDateTime);
      if (endDateTime) params.append('endDateTime', endDateTime);
      
      try {
        const res = await fetch(`/api/reports?${params.toString()}`);
        const data = await res.json();
        setUserReport(data);
      } finally {
        setUserReportLoading(false);
      }
    };
    
    fetchUserReport();
  }, [selectedUserId, startDate, endDate, startTime, endTime]);

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setStartTime('');
    setEndTime('');
    setSelectedUserId('');
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Date & Time Filter */}
      <Card className="shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-gray-500" />
            <span className="font-medium">تصفية حسب التاريخ والوقت</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-xs">من تاريخ</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">إلى تاريخ</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-xs">من وقت</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">إلى وقت</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
          
          {(startDate || endDate || startTime || endTime) && (
            <button
              className="text-sm text-teal-600 hover:underline"
              onClick={clearFilters}
            >
              مسح التصفية
            </button>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            title="إجمالي المبيعات"
            value={`${stats.totalSales.toLocaleString()} ﷼`}
            icon={DollarSign}
          />
          <StatCard
            title="صافي الأرباح"
            value={`${stats.totalProfit.toLocaleString()} ﷼`}
            icon={TrendingUp}
            color="emerald"
          />
        </div>
      )}

      {/* User Selection for Report */}
      <Card className="shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-5 w-5 text-gray-500" />
            <span className="font-medium">تقرير مستخدم محدد</span>
          </div>
          
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full h-10 px-3 border rounded-lg text-sm bg-white"
          >
            <option value="">اختر مستخدم</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          
          {userReportLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          )}
          
          {userReport && userReport.user && !userReportLoading && (
            <div className="mt-4 p-3 bg-teal-50 rounded-lg border border-teal-200">
              <p className="font-medium text-teal-800 mb-2">{userReport.user.name}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500">الفواتير</p>
                  <p className="font-bold text-gray-800">{userReport.totalInvoices}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">المبيعات</p>
                  <p className="font-bold text-gray-800">{userReport.totalSales.toLocaleString()} ﷼</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">صافي الربح</p>
                  <p className="font-bold text-teal-600">{userReport.totalProfit.toLocaleString()} ﷼</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Performance Table */}
      <Card className="shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-gray-500" />
            <span className="font-medium">أداء المستخدمين</span>
          </div>
          
          {users.length === 0 ? (
            <p className="text-center text-gray-400 py-4">لا توجد بيانات</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.totalInvoices} فاتورة</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800">{u.totalSales.toLocaleString()} ﷼</p>
                    <p className="text-xs text-teal-600">+{u.totalProfit.toLocaleString()} ﷼ ربح</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
