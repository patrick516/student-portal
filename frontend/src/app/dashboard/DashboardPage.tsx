import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/app/state/useApp";
import { api } from "@/api/client";

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-[hsl(var(--muted-foreground))]">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {hint && (
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            {hint}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type SummaryRow = {
  date: string;
  status: "present" | "absent" | "late";
  _count: { _all: number };
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysBack(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export default function DashboardPage() {
  const { user, selectedClassId } = useApp();

  // weekly attendance series (teacher/admin)
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const to = isoDate(new Date());
  const from = isoDate(daysBack(6));

  const loadWeekly = async () => {
    if (!selectedClassId) return;
    setLoading(true);
    try {
      const { data } = await api.get("/api/attendance/summary", {
        params: { classId: selectedClassId, from, to },
      });
      setSummary((data?.data as SummaryRow[]) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== "bursar") loadWeekly();
  }, [selectedClassId, user?.role]);

  const series = useMemo(() => {
    const map = new Map<string, { present: number; total: number }>();

    // build 7-day window
    for (let i = 6; i >= 0; i--) {
      map.set(isoDate(daysBack(i)), { present: 0, total: 0 });
    }

    // aggregate attendance
    for (const row of summary) {
      const key = row.date?.slice(0, 10);
      if (!map.has(key)) continue;
      const ent = map.get(key)!;
      ent.total += row._count._all;
      if (row.status === "present") ent.present += row._count._all;
    }

    return Array.from(map.entries()).map(([date, { present, total }]) => ({
      date,
      pct: total ? Math.round((present / total) * 100) : 0,
    }));
  }, [summary]);

  const presentAvg = useMemo(
    () =>
      series.length
        ? Math.round(series.reduce((a, b) => a + b.pct, 0) / series.length)
        : 0,
    [series]
  );

  const lowestPct = useMemo(
    () => (series.length ? Math.min(100, ...series.map((s) => s.pct)) : 0),
    [series]
  );

  // bursar stats (very light: from invoices/payments)
  const [invStats, setInvStats] = useState<{
    outstanding: number;
    paid: number;
    partial: number;
  }>({ outstanding: 0, paid: 0, partial: 0 });
  const [paidThisMonth, setPaidThisMonth] = useState<number>(0);

  const loadFees = async () => {
    const [inv, pay] = await Promise.all([
      api.get("/api/fees/invoices"),
      api.get("/api/fees/payments"),
    ]);
    const invoices = inv.data.data || [];
    const payments = pay.data.data || [];

    const outstanding = invoices
      .filter((i: any) => i.status !== "paid")
      .reduce((s: number, i: any) => s + Number(i.amount), 0);

    const paid = invoices
      .filter((i: any) => i.status === "paid")
      .reduce((s: number, i: any) => s + Number(i.amount), 0);

    const partial = invoices
      .filter((i: any) => i.status === "partial")
      .reduce((s: number, i: any) => s + Number(i.amount), 0);

    setInvStats({ outstanding, paid, partial });

    const month = new Date().toISOString().slice(0, 7);
    setPaidThisMonth(
      payments
        .filter((p: any) => (p.paidAt || "").slice(0, 7) === month)
        .reduce((s: number, p: any) => s + Number(p.amount), 0)
    );
  };

  useEffect(() => {
    if (user?.role === "bursar") loadFees();
  }, [user?.role]);

  return (
    <div className="space-y-6">
      {/* Role-aware stat row */}
      {user?.role === "bursar" ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Fees Collected (MTD)"
            value={paidThisMonth.toLocaleString()}
            hint="This month"
          />
          <Stat
            label="Outstanding (all)"
            value={invStats.outstanding.toLocaleString()}
          />
          <Stat label="Paid (all)" value={invStats.paid.toLocaleString()} />
          <Stat
            label="Partial (all)"
            value={invStats.partial.toLocaleString()}
          />
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Weekly Avg Attendance"
            value={`${presentAvg}%`}
            hint="Last 7 days"
          />
          <Stat
            label="Best Day"
            value={`${Math.max(0, ...series.map((s) => s.pct))}%`}
          />
          <Stat label="Lowest Day" value={`${lowestPct}%`} />
          <Stat
            label="Selected Class"
            value={selectedClassId ? "Active" : "—"}
          />
        </section>
      )}

      {/* Weekly bar (hide for bursar) */}
      {user?.role !== "bursar" && (
        <Card>
          <CardHeader>
            <CardTitle>
              Attendance – Last 7 days{" "}
              {loading && (
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                  Loading…
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid items-end h-56 grid-cols-7 gap-3">
              {series.map((s) => (
                <div key={s.date} className="flex flex-col items-center gap-2">
                  <div
                    className="w-8 rounded-md bg-[hsl(var(--ring))]"
                    style={{ height: `${s.pct || 2}%` }}
                    title={`${s.pct}%`}
                  />
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {s.date.slice(5)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent activity placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
          <div>✔️ Attendance updated</div>
          <div>➕ Teacher added</div>
          <div>💳 Payment recorded</div>
        </CardContent>
      </Card>
    </div>
  );
}
