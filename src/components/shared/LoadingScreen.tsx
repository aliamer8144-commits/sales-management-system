'use client';

import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-100">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto" />
        <p className="mt-4 text-gray-600 font-medium">جاري التحميل...</p>
      </div>
    </div>
  );
}
