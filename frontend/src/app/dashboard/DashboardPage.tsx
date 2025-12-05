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
    <Card className="border-none shadow-sm bg-white/95 rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium tracking-wide text-[hsl(var(--muted-foreground))] uppercase">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {hint && (
          <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
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

type InvoiceSummary = {
  status: "paid" | "partial" | "unpaid" | string;
  amount: number | string;
};

type PaymentSummary = {
  paidAt?: string | null;
  amount: number | string;
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

  useEffect(() => {
    if (!selectedClassId || user?.role === "bursar") return;

    const loadWeekly = async () => {
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

    void loadWeekly();
  }, [selectedClassId, user?.role, from, to]);

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

  // bursar stats (from invoices/payments)
  const [invStats, setInvStats] = useState<{
    outstanding: number;
    paid: number;
    partial: number;
  }>({ outstanding: 0, paid: 0, partial: 0 });
  const [paidThisMonth, setPaidThisMonth] = useState<number>(0);

  useEffect(() => {
    if (user?.role !== "bursar") return;

    const loadFees = async () => {
      const [invResponse, payResponse] = await Promise.all([
        api.get("/api/fees/invoices"),
        api.get("/api/fees/payments"),
      ]);

      const invoices = (invResponse.data?.data ?? []) as InvoiceSummary[];
      const payments = (payResponse.data?.data ?? []) as PaymentSummary[];

      const sumAmount = (values: Array<{ amount: number | string }>) =>
        values.reduce((sum, item) => sum + Number(item.amount), 0);

      const outstandingInvoices = invoices.filter(
        (invoice) => invoice.status !== "paid"
      );
      const paidInvoices = invoices.filter(
        (invoice) => invoice.status === "paid"
      );
      const partialInvoices = invoices.filter(
        (invoice) => invoice.status === "partial"
      );

      setInvStats({
        outstanding: sumAmount(outstandingInvoices),
        paid: sumAmount(paidInvoices),
        partial: sumAmount(partialInvoices),
      });

      const month = new Date().toISOString().slice(0, 7);
      const paidThisMonthTotal = payments
        .filter((payment) => (payment.paidAt ?? "").slice(0, 7) === month)
        .reduce((sum, payment) => sum + Number(payment.amount), 0);

      setPaidThisMonth(paidThisMonthTotal);
    };

    void loadFees();
  }, [user?.role]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
        <Card className="border-none shadow-sm bg-white/95 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-semibold">
              <span>Attendance – Last 7 days</span>
              {loading && (
                <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">
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
                    className="w-7 rounded-xl bg-[hsl(var(--ring))] shadow-sm transition hover:opacity-90"
                    style={{ height: `${s.pct || 3}%` }}
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
      <Card className="border-none shadow-sm bg-white/95 rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
          <div className="flex items-center gap-2">
            <span>✔️</span>
            <span>Attendance updated</span>
          </div>
          <div className="flex items-center gap-2">
            <span>➕</span>
            <span>Teacher added</span>
          </div>
          <div className="flex items-center gap-2">
            <span>💳</span>
            <span>Payment recorded</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
