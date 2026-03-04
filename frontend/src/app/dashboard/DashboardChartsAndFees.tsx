// src/app/features/dashboard/DashboardChartsAndFees.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Loader2, PieChart } from "lucide-react";

type SeriesPoint = { date: string; pct: number };

interface InvStats {
  outstanding: number;
  paid: number;
  partial: number;
}

interface DashboardChartsAndFeesProps {
  isBursar: boolean;
  series: SeriesPoint[];
  loading: boolean;
  presentAvg: number;
  invStats: InvStats;
  paidThisMonth: number;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function DashboardChartsAndFees({
  isBursar,
  series,
  loading,
  presentAvg,
  invStats,
  paidThisMonth,
}: DashboardChartsAndFeesProps) {
  const totalFeesAll = invStats.outstanding + invStats.paid + invStats.partial;

  const paidPctPie = totalFeesAll ? (invStats.paid / totalFeesAll) * 100 : 0;
  const partialPctPie = totalFeesAll
    ? (invStats.partial / totalFeesAll) * 100
    : 0;
  const outstandingPctPie = totalFeesAll
    ? (invStats.outstanding / totalFeesAll) * 100
    : 0;

  return (
    <>
      {/* Attendance Chart (non-bursar) */}
      {!isBursar && (
        <Card className="overflow-hidden transition-all duration-300 shadow-sm border-slate-200 hover:shadow-md">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg shadow bg-gradient-to-br from-blue-500 to-indigo-600">
                  <BarChart3 size={18} className="text-white" />
                </div>
                <CardTitle className="text-base font-semibold text-slate-800">
                  Attendance Trend – Last 7 Days
                </CardTitle>
              </div>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Loading data...</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid items-end h-64 grid-cols-7 gap-4">
              {series.map((s) => {
                const height = Math.max(s.pct, 10);
                const isToday = s.date === isoDate(new Date());

                return (
                  <div
                    key={s.date}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="relative flex flex-col items-center">
                      <div
                        className="w-10 transition-all duration-300 rounded-lg shadow-md bg-gradient-to-t from-blue-400 to-blue-500 hover:shadow-lg hover:w-12"
                        style={{ height: `${height}%` }}
                        title={`${s.pct}% attendance`}
                      >
                        {isToday && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-medium text-white">
                            Today
                          </div>
                        )}
                      </div>
                      <span className="mt-2 text-xs font-medium text-slate-600">
                        {s.pct}%
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(s.date).toLocaleDateString("en-US", {
                        weekday: "short",
                      })}
                    </div>
                    <div className="text-[10px] font-medium text-slate-400">
                      {s.date.slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-4 pt-4 mt-6 text-sm border-t border-slate-100 text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-6 h-2 rounded bg-gradient-to-r from-blue-400 to-blue-500"></div>
                <span>Daily Attendance Percentage</span>
              </div>
              {presentAvg > 0 && (
                <span className="font-medium text-blue-600">
                  Weekly Average: {presentAvg}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fees Distribution */}
      {totalFeesAll > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden transition-all duration-300 shadow-sm border-slate-200 hover:shadow-md">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg shadow bg-gradient-to-br from-emerald-500 to-green-600">
                  <PieChart size={18} className="text-white" />
                </div>
                <CardTitle className="text-base font-semibold text-slate-800">
                  School Fees Distribution
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center gap-6 md:flex-row md:items-start">
                <div className="relative">
                  <div
                    className="relative w-48 h-48 rounded-full shadow-lg"
                    style={{
                      backgroundImage: `conic-gradient(
                        #10b981 0 ${paidPctPie}%,
                        #f59e0b ${paidPctPie}% ${paidPctPie + partialPctPie}%,
                        #ef4444 ${paidPctPie + partialPctPie}% 100%
                      )`,
                    }}
                  >
                    <div className="absolute flex items-center justify-center bg-white rounded-full shadow-inner inset-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-800">
                          {totalFeesAll.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">
                          Total (MWK)
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-center text-slate-600">
                    Total Fees: MWK {totalFeesAll.toLocaleString()}
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-3 rounded-full bg-emerald-500"></div>
                        <div>
                          <div className="font-medium text-slate-800">
                            Paid in Full
                          </div>
                          <div className="text-xs text-slate-500">
                            Completed payments
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">
                          MWK {invStats.paid.toLocaleString()}
                        </div>
                        <div className="text-sm font-medium text-emerald-600">
                          {paidPctPie.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-amber-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-3 rounded-full bg-amber-500"></div>
                        <div>
                          <div className="font-medium text-slate-800">
                            Partial Payments
                          </div>
                          <div className="text-xs text-slate-500">
                            In progress
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">
                          MWK {invStats.partial.toLocaleString()}
                        </div>
                        <div className="text-sm font-medium text-amber-600">
                          {partialPctPie.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-red-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-3 bg-red-500 rounded-full"></div>
                        <div>
                          <div className="font-medium text-slate-800">
                            Outstanding
                          </div>
                          <div className="text-xs text-slate-500">
                            Pending payments
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">
                          MWK {invStats.outstanding.toLocaleString()}
                        </div>
                        <div className="text-sm font-medium text-red-600">
                          {outstandingPctPie.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden shadow-sm border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/30">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-800">
                Quick Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-700">
                    Collection Rate
                  </div>
                  <div className="text-lg font-bold text-emerald-600">
                    {((invStats.paid / totalFeesAll) * 100 || 0).toFixed(1)}%
                  </div>
                </div>
                <div className="h-2 mt-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                    style={{
                      width: `${(invStats.paid / totalFeesAll) * 100 || 0}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-lg shadow-sm">
                <div className="mb-2 text-sm font-medium text-slate-700">
                  Monthly Performance
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">This Month</div>
                    <div className="text-xl font-bold text-slate-800">
                      MWK {paidThisMonth.toLocaleString()}
                    </div>
                  </div>
                  <div className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded-full">
                    Active
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
