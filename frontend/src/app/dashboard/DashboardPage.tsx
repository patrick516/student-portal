// src/app/features/dashboard/DashboardPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/app/state/useApp";
import { api } from "@/api/client";
import { DashboardWelcomeHeader } from "./DashboardWelcomeHeader";
import { DashboardStatsGrid } from "./DashboardStatsGrid";
import { DashboardChartsAndFees } from "./DashboardChartsAndFees";

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

interface Student {
  id: string;
}

interface User {
  id: string;
  role?: string;
  name?: string;
  email?: string;
}

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

  const isAdmin = user?.role === "admin";
  const isBursar = user?.role === "bursar";

  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const to = isoDate(new Date());
  const from = isoDate(daysBack(6));

  useEffect(() => {
    if (!selectedClassId || isBursar) return;

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
  }, [selectedClassId, isBursar, from, to]);

  const series = useMemo(() => {
    const map = new Map<string, { present: number; total: number }>();

    for (let i = 6; i >= 0; i--) {
      map.set(isoDate(daysBack(i)), { present: 0, total: 0 });
    }

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

  const bestPct = useMemo(
    () => (series.length ? Math.max(0, ...series.map((s) => s.pct)) : 0),
    [series]
  );

  const lowestPct = useMemo(
    () => (series.length ? Math.min(100, ...series.map((s) => s.pct)) : 0),
    [series]
  );

  const [invStats, setInvStats] = useState<{
    outstanding: number;
    paid: number;
    partial: number;
  }>({ outstanding: 0, paid: 0, partial: 0 });
  const [paidThisMonth, setPaidThisMonth] = useState<number>(0);

  useEffect(() => {
    if (!user || (user.role !== "bursar" && user.role !== "admin")) return;

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
  }, [user]);

  const [totalStudents, setTotalStudents] = useState<number | null>(null);
  const [totalStaff, setTotalStaff] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    const loadCounts = async () => {
      try {
        const [studentsRes, usersRes] = await Promise.all([
          api.get("/api/students"),
          api.get("/api/users"),
        ]);

        const students = (studentsRes.data?.data ?? []) as Student[];
        const users = (usersRes.data?.data ?? []) as User[];

        const staffUsers = users.filter((u) => u.role && u.role !== "student");

        setTotalStudents(students.length);
        setTotalStaff(staffUsers.length);
      } catch {
        // fail silently
      }
    };

    void loadCounts();
  }, [isAdmin]);

  const attendanceTrend =
    presentAvg > 80 ? "up" : presentAvg < 60 ? "down" : "neutral";

  return (
    <div className="w-full p-1 mx-auto space-y-6">
      <DashboardWelcomeHeader user={user ?? null} />

      <DashboardStatsGrid
        isAdmin={!!isAdmin}
        isBursar={!!isBursar}
        selectedClassId={selectedClassId ?? null}
        presentAvg={presentAvg}
        bestPct={bestPct}
        lowestPct={lowestPct}
        totalStudents={totalStudents}
        totalStaff={totalStaff}
        invStats={invStats}
        paidThisMonth={paidThisMonth}
        attendanceTrend={attendanceTrend}
      />

      <DashboardChartsAndFees
        isBursar={!!isBursar}
        series={series}
        loading={loading}
        presentAvg={presentAvg}
        invStats={invStats}
        paidThisMonth={paidThisMonth}
      />
    </div>
  );
}
