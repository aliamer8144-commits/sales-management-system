'use client';

import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: 'teal' | 'emerald' | 'amber' | 'rose';
  subtitle?: string;
}

export function StatCard({ title, value, icon: Icon, color = 'teal', subtitle }: StatCardProps) {
  const colors = {
    teal: 'from-teal-500 to-teal-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-600',
  };

  return (
    <Card className="shadow-md border-0">
      <CardContent className="py-1 px-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-base text-gray-500">{title}</p>
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
