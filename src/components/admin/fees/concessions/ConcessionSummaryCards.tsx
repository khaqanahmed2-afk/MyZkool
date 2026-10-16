import React from "react";
import { Users, Tag, Clock, Calendar } from "lucide-react";
import type { ConcessionSummaryMetrics } from "../../../../types/fees";
import { formatCurrencyPaise } from "../../../../services/concessionService";

interface ConcessionSummaryCardsProps {
  metrics: ConcessionSummaryMetrics;
  loading?: boolean;
}

export function ConcessionSummaryCards({ metrics, loading }: ConcessionSummaryCardsProps) {
  const cards = [
    {
      id: "active",
      title: "Active Concessions",
      value: loading ? "…" : metrics.activeCount.toLocaleString(),
      subtitle: "Currently applied",
      icon: Users,
      iconBg: "bg-[#E6F4EA]",
      iconColor: "text-[#00875A]",
    },
    {
      id: "discount",
      title: "Discount This Month",
      value: loading ? "…" : formatCurrencyPaise(metrics.discountThisMonthPaise),
      subtitle: "Applied concessions",
      icon: Tag,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      id: "pending",
      title: "Pending Approval",
      value: loading ? "…" : metrics.pendingCount.toLocaleString(),
      subtitle: "Awaiting review",
      icon: Clock,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
    },
    {
      id: "scheduled",
      title: "Scheduled",
      value: loading ? "…" : metrics.scheduledCount.toLocaleString(),
      subtitle: "Future start dates",
      icon: Calendar,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="bg-white rounded-xl border border-[#E6EAF3] p-4 shadow-sm hover:shadow transition-shadow flex items-center gap-4"
          >
            <div
              className={`w-12 h-12 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500 truncate">{card.title}</p>
              <p className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                {card.value}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">{card.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
