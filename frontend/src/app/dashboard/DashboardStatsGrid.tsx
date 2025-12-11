// src/app/features/dashboard/DashboardStatsGrid.tsx
import type { ReactNode } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  UserCog,
  Calendar,
  School,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  Award,
  BarChart3,
} from "lucide-react";

interface StatBoxProps {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  trend?: "up" | "down" | "neutral";
}

function StatBox({ label, value, hint, icon, trend }: StatBoxProps) {
  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-emerald-500";
      case "down":
        return "text-rose-500";
      default:
        return "text-slate-400";
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp size={14} className="text-emerald-500" />;
      case "down":
        return <TrendingDown size={14} className="text-rose-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300">
      <div className="absolute inset-0 transition-opacity duration-300 opacity-0 bg-gradient-to-br from-white via-slate-50/50 to-white group-hover:opacity-100" />

      <div className="relative z-10 flex items-center justify-center w-12 h-12 mb-4 transition-shadow duration-300 shadow-sm rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 group-hover:shadow-md">
        <div className="text-blue-600">{icon}</div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium tracking-wider uppercase text-slate-500">
            {label}
          </span>
          {trend && getTrendIcon()}
        </div>

        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-bold text-slate-800">{value}</span>
          {hint && (
            <span className={`text-xs font-medium ${getTrendColor()}`}>
              {hint}
            </span>
          )}
        </div>

        {hint && !trend && (
          <span className="text-xs text-slate-400">{hint}</span>
        )}
      </div>
    </div>
  );
}

interface InvStats {
  outstanding: number;
  paid: number;
  partial: number;
}

interface DashboardStatsGridProps {
  isAdmin: boolean;
  isBursar: boolean;
  selectedClassId: string | null;
  presentAvg: number;
  bestPct: number;
  lowestPct: number;
  totalStudents: number | null;
  totalStaff: number | null;
  invStats: InvStats;
  paidThisMonth: number;
  attendanceTrend: "up" | "down" | "neutral";
}

export function DashboardStatsGrid({
  isAdmin,
  isBursar,
  selectedClassId,
  presentAvg,
  bestPct,
  lowestPct,
  totalStudents,
  totalStaff,
  invStats,
  paidThisMonth,
  attendanceTrend,
}: DashboardStatsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {isBursar ? (
        <>
          <StatBox
            label="Fees Collected (MTD)"
            value={`MWK ${paidThisMonth.toLocaleString()}`}
            hint="This month"
            icon={<DollarSign size={20} />}
            trend="up"
          />
          <StatBox
            label="Outstanding Balance"
            value={`MWK ${invStats.outstanding.toLocaleString()}`}
            icon={<AlertCircle size={20} />}
            trend="down"
          />
          <StatBox
            label="Paid in Full"
            value={`MWK ${invStats.paid.toLocaleString()}`}
            icon={<CheckCircle size={20} />}
            trend="up"
          />
          <StatBox
            label="Partial Payments"
            value={`MWK ${invStats.partial.toLocaleString()}`}
            icon={<Clock size={20} />}
            trend="neutral"
          />
        </>
      ) : isAdmin ? (
        <>
          <StatBox
            label="Total Students"
            value={totalStudents !== null ? totalStudents.toString() : "-"}
            icon={<Users size={20} />}
            trend="up"
          />
          <StatBox
            label="Teaching Staff"
            value={totalStaff !== null ? totalStaff.toString() : "-"}
            icon={<UserCog size={20} />}
            trend="neutral"
          />
          <StatBox
            label="Weekly Attendance"
            value={`${presentAvg}%`}
            hint="Last 7 days"
            icon={<BarChart3 size={20} />}
            trend={attendanceTrend}
          />
          <StatBox
            label="Active Classes"
            value={selectedClassId ? "1" : "0"}
            icon={<School size={20} />}
            trend="neutral"
          />
        </>
      ) : (
        <>
          <StatBox
            label="Weekly Attendance"
            value={`${presentAvg}%`}
            hint="Last 7 days"
            icon={<BarChart3 size={20} />}
            trend={attendanceTrend}
          />
          <StatBox
            label="Best Day"
            value={`${bestPct}%`}
            icon={<Award size={20} />}
            trend="up"
          />
          <StatBox
            label="Lowest Day"
            value={`${lowestPct}%`}
            icon={<TrendingDown size={20} />}
            trend="down"
          />
          <StatBox
            label="Active Class"
            value={selectedClassId ? "Active" : "—"}
            hint={selectedClassId ? "Selected" : "None"}
            icon={<Calendar size={20} />}
            trend="neutral"
          />
        </>
      )}
    </div>
  );
}
