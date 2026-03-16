'use client';

import { User } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  title: string;
}

export function Header({ user, onLogout, title }: HeaderProps) {
  return (
    <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b shadow-sm z-40">
      <div className="flex items-center justify-between px-4 h-14">
        <h1 className="text-lg font-bold text-gray-800">{title}</h1>
        <div className="flex items-center gap-2">
          <div className="text-left">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-gray-500">{user.role === 'admin' ? 'مدير' : 'مستخدم'}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onLogout} className="text-gray-400 hover:text-red-500">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
