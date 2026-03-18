"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, TrendingUp, TrendingDown, ChevronLeft } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  totalDebt: number;
  totalPaid: number;
  balance: number;
  lastInvoiceDate?: string;
}

interface CustomerCardProps {
  customer: Customer;
  onClick?: (customer: Customer) => void;
}

export function CustomerCard({ customer, onClick }: CustomerCardProps) {
  const hasDebt = customer.balance > 0;
  const isCreditor = customer.balance < 0;
  const isZero = customer.balance === 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-SA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount)) + " ﷼";
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Intl.DateTimeFormat("ar-SA", {
      month: "short",
      day: "numeric",
    }).format(new Date(dateStr));
  };

  return (
    <Card
      dir="rtl"
      onClick={() => onClick?.(customer)}
      className={`
        group relative overflow-hidden
        bg-white hover:bg-gradient-to-br hover:from-white hover:to-slate-50/50
        border border-slate-200/60 hover:border-slate-300/80
        rounded-xl p-3.5
        transition-all duration-200 ease-out
        hover:shadow-md hover:shadow-slate-200/40
        cursor-pointer
        active:scale-[0.98]
      `}
    >
      {/* Subtle gradient accent line */}
      <div
        className={`
          absolute top-0 right-0 left-0 h-[2px]
          ${hasDebt ? "bg-gradient-to-l from-amber-400 via-orange-400 to-orange-300" : ""}
          ${isCreditor ? "bg-gradient-to-l from-teal-400 via-emerald-400 to-emerald-300" : ""}
          ${isZero ? "bg-gradient-to-l from-slate-300 via-slate-200 to-slate-200" : ""}
          opacity-80 group-hover:opacity-100 transition-opacity
        `}
      />

      {/* Main content */}
      <div className="flex items-start justify-between gap-3">
        {/* Right side - Customer info */}
        <div className="flex-1 min-w-0 py-0.5">
          {/* Name - primary typography */}
          <h3 className="font-semibold text-slate-800 text-[15px] leading-snug truncate mb-0.5">
            {customer.name}
          </h3>

          {/* Phone - if exists */}
          {customer.phone && (
            <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1.5">
              <Phone className="w-3 h-3 flex-shrink-0 opacity-70" />
              <span className="font-medium tracking-wide" dir="ltr">
                {customer.phone}
              </span>
            </div>
          )}

          {/* Financial stats row - compact */}
          <div className="flex items-center gap-2.5 text-[11px]">
            {customer.totalDebt > 0 && (
              <div className="flex items-center gap-0.5">
                <span className="text-slate-400">دين</span>
                <span className="font-semibold text-amber-600 mr-0.5">
                  {formatCurrency(customer.totalDebt)}
                </span>
              </div>
            )}
            {customer.totalPaid > 0 && (
              <div className="flex items-center gap-0.5">
                <span className="text-slate-400">مدفوع</span>
                <span className="font-semibold text-emerald-600 mr-0.5">
                  {formatCurrency(customer.totalPaid)}
                </span>
              </div>
            )}
            {!customer.totalDebt && !customer.totalPaid && (
              <span className="text-slate-400">لا توجد معاملات</span>
            )}
          </div>
        </div>

        {/* Left side - Balance & meta */}
        <div className="flex flex-col items-end gap-1.5">
          {/* Balance Badge - premium styling */}
          <Badge
            variant="outline"
            className={`
              px-2.5 py-1 rounded-lg font-semibold text-xs
              border-0 shadow-sm gap-1
              ${
                hasDebt
                  ? "bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 shadow-amber-100/50"
                  : ""
              }
              ${
                isCreditor
                  ? "bg-gradient-to-br from-teal-50 to-emerald-50 text-teal-700 shadow-teal-100/50"
                  : ""
              }
              ${
                isZero
                  ? "bg-slate-100 text-slate-500 shadow-slate-100"
                  : ""
              }
            `}
          >
            {hasDebt && <TrendingDown className="w-3 h-3" />}
            {isCreditor && <TrendingUp className="w-3 h-3" />}
            <span>{formatCurrency(customer.balance)}</span>
          </Badge>

          {/* Last invoice date - subtle meta */}
          {customer.lastInvoiceDate && (
            <span className="text-[10px] text-slate-400 font-medium">
              {formatDate(customer.lastInvoiceDate)}
            </span>
          )}
        </div>
      </div>

      {/* Hover arrow indicator */}
      <ChevronLeft
        className="
          absolute bottom-2.5 left-2
          w-3.5 h-3.5 text-slate-300
          opacity-0 group-hover:opacity-70
          transition-all duration-200
          group-hover:-translate-x-0.5
        "
      />
    </Card>
  );
}
