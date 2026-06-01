// frontend/src/app/reports/FeeReportPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { useApp } from "@/app/state/useApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Filter,
  Printer,
  Loader2,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  School,
} from "lucide-react";

type Term = { id: string; name: string; year: number; isActive: boolean };

type StudentRow = {
  studentId: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  className: string | null;
  guardian: string | null;
  guardianPhone: string | null;
  required: number;
  totalPaid: number;
  balance: number;
  status: "paid" | "partial" | "no_payment" | "clear";
};

type ClassSummary = {
  classId: string;
  className: string;
  total: number;
  paidFull: number;
  partial: number;
  noPayment: number;
  debtors: number;
  collected: number;
  outstanding: number;
};

type Totals = {
  totalStudents: number;
  paidFull: number;
  partial: number;
  noPayment: number;
  debtors: number;
  totalCollected: number;
  totalOutstanding: number;
  totalRequired: number;
};

type SchoolInfo = {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  motto?: string;
  logoUrl?: string;
};

type ReportData = {
  school: SchoolInfo;
  term: Term | null;
  summary: ClassSummary[];
  students: StudentRow[];
  totals: Totals;
  generatedAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Paid in Full",
  partial: "Partial",
  no_payment: "No Payment",
  clear: "Clear",
};

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  partial: "bg-amber-100 text-amber-700",
  no_payment: "bg-red-100 text-red-700",
  clear: "bg-blue-100 text-blue-700",
};

function fmt(n: number) {
  return `MWK ${Number(n).toLocaleString()}`;
}

export default function FeeReportPage() {
  const { classes } = useApp();
  const [terms, setTerms] = useState<Term[]>([]);
  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("all");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  // Load terms on mount
  const loadTerms = useCallback(async () => {
    const { data } = await api.get("/api/terms");
    const list: Term[] = data.data || [];
    setTerms(list);
    const active = list.find((t) => t.isActive);
    if (active) setTermId(active.id);
  }, []);

  useEffect(() => {
    void loadTerms();
  }, [loadTerms]);

  // Load report
  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (termId) params.termId = termId;
      if (classId) params.classId = classId;
      if (status && status !== "all") params.status = status;
      const { data } = await api.get("/api/reports/fees", { params });
      setReport(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [termId, classId, status]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const classLabel = useMemo(() => {
    const c = classes.find((x) => x.id === classId);
    return c ? `${c.name}${c.stream ? " " + c.stream : ""}` : "All Classes";
  }, [classes, classId]);

  // ── PDF Export ──────────────────────────────────────────────
  const exportPDF = () => {
    if (!report) return;
    const w = window.open("", "_blank");
    if (!w) return;

    const { school, term, summary, students, totals, generatedAt } = report;

    const logoHtml = school.logoUrl
      ? `<img src="${school.logoUrl}" style="width:70px;height:70px;object-fit:contain;" />`
      : `<div style="width:70px;height:70px;background:#4F46E5;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:22px;">${school.name?.charAt(0) || "S"}</div>`;

    const summaryRows = summary
      .map(
        (s) => `
        <tr>
          <td>${s.className}</td>
          <td>${s.total}</td>
          <td style="color:#16a34a">${s.paidFull}</td>
          <td style="color:#d97706">${s.partial}</td>
          <td>${s.noPayment}</td>
          <td style="color:#dc2626">${s.debtors}</td>
          <td>MWK ${s.collected.toLocaleString()}</td>
          <td style="color:#dc2626">MWK ${s.outstanding.toLocaleString()}</td>
        </tr>`,
      )
      .join("");

    const studentRows = students
      .map(
        (r) => `
        <tr>
          <td>${r.studentCode}</td>
          <td><b>${r.firstName} ${r.lastName}</b></td>
          <td>${r.className || ""}</td>
          <td>${r.guardian || "-"}</td>
          <td>${r.guardianPhone || "-"}</td>
          <td>MWK ${r.required.toLocaleString()}</td>
          <td style="color:#16a34a">MWK ${r.totalPaid.toLocaleString()}</td>
          <td style="color:${r.balance > 0 ? "#dc2626" : "#16a34a"}">
            MWK ${r.balance.toLocaleString()}
          </td>
          <td>
            <span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;
              background:${
                r.status === "paid"
                  ? "#dcfce7"
                  : r.status === "partial"
                    ? "#fef9c3"
                    : "#fee2e2"
              };
              color:${
                r.status === "paid"
                  ? "#16a34a"
                  : r.status === "partial"
                    ? "#92400e"
                    : "#dc2626"
              }">
              ${STATUS_LABELS[r.status] || r.status}
            </span>
          </td>
        </tr>`,
      )
      .join("");

    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>School Fees Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; padding: 32px; color: #111827; }
          .header { display: flex; align-items: center; gap: 20px; padding-bottom: 16px; border-bottom: 3px solid #4F46E5; margin-bottom: 24px; }
          .school-info h1 { font-size: 22px; font-weight: 800; color: #1e1b4b; }
          .school-info p { font-size: 12px; color: #6b7280; margin-top: 2px; }
          .report-title { text-align: center; margin-bottom: 20px; }
          .report-title h2 { font-size: 18px; font-weight: 700; color: #1e1b4b; }
          .report-title p { font-size: 12px; color: #6b7280; margin-top: 4px; }
          .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; }
          .card .label { font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; }
          .card .value { font-size: 22px; font-weight: 800; margin-top: 4px; }
          .card .value.green { color: #16a34a; }
          .card .value.amber { color: #d97706; }
          .card .value.red { color: #dc2626; }
          .card .value.blue { color: #1d4ed8; }
          .money-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
          .section-title { font-size: 14px; font-weight: 700; color: #1e1b4b; margin-bottom: 10px; padding-left: 8px; border-left: 4px solid #4F46E5; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
          th { background: #f3f4f6; padding: 8px 10px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #374151; border-bottom: 2px solid #e5e7eb; }
          td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
          tr:hover td { background: #f9fafb; }
          tfoot td { font-weight: 700; background: #f3f4f6; border-top: 2px solid #e5e7eb; }
          .footer { text-align: center; margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }
          @media print {
            body { padding: 16px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <!-- School Header -->
        <div class="header">
          ${logoHtml}
          <div class="school-info">
            <h1>${school.name || "School Name"}</h1>
            ${school.address ? `<p>${school.address}</p>` : ""}
            ${school.motto ? `<p style="font-style:italic;color:#4F46E5">"${school.motto}"</p>` : ""}
            ${school.phone ? `<p>Tel: ${school.phone}</p>` : ""}
          </div>
        </div>

        <!-- Report Title -->
        <div class="report-title">
          <h2>School Fees Report</h2>
          <p>
            Academic Year: ${term?.year || "—"} &nbsp;|&nbsp;
            ${term ? term.name : "All Terms"} &nbsp;|&nbsp;
            ${classLabel}
          </p>
          <p>Generated: ${new Date(generatedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}</p>
        </div>

        <!-- Overall Summary Cards -->
        <div class="section-title">Overall Summary</div>
        <div class="summary-cards">
          <div class="card">
            <div class="label">Total Students</div>
            <div class="value blue">${totals.totalStudents}</div>
          </div>
          <div class="card">
            <div class="label">Paid in Full</div>
            <div class="value green">${totals.paidFull}</div>
          </div>
          <div class="card">
            <div class="label">Partial</div>
            <div class="value amber">${totals.partial}</div>
          </div>
          <div class="card">
            <div class="label">Debtors</div>
            <div class="value red">${totals.debtors}</div>
          </div>
        </div>

        <div class="money-cards">
          <div class="card">
            <div class="label">Total Collected</div>
            <div class="value green">MWK ${totals.totalCollected.toLocaleString()}</div>
          </div>
          <div class="card">
            <div class="label">Total Outstanding</div>
            <div class="value red">MWK ${totals.totalOutstanding.toLocaleString()}</div>
          </div>
          <div class="card">
            <div class="label">Total Required</div>
            <div class="value blue">MWK ${totals.totalRequired.toLocaleString()}</div>
          </div>
        </div>

        <!-- Summary by Class -->
        <div class="section-title">Summary by Class</div>
        <table>
          <thead>
            <tr>
              <th>Class</th>
              <th>Students</th>
              <th>Paid Full</th>
              <th>Partial</th>
              <th>No Payment</th>
              <th>Debtors</th>
              <th>Collected</th>
              <th>Outstanding</th>
            </tr>
          </thead>
          <tbody>${summaryRows}</tbody>
          <tfoot>
            <tr>
              <td>TOTAL</td>
              <td>${totals.totalStudents}</td>
              <td style="color:#16a34a">${totals.paidFull}</td>
              <td style="color:#d97706">${totals.partial}</td>
              <td>${totals.noPayment}</td>
              <td style="color:#dc2626">${totals.debtors}</td>
              <td>MWK ${totals.totalCollected.toLocaleString()}</td>
              <td style="color:#dc2626">MWK ${totals.totalOutstanding.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <!-- Detailed Student List -->
        <div class="section-title">Detailed Student List</div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Student Name</th>
              <th>Class</th>
              <th>Parent</th>
              <th>Phone</th>
              <th>Required</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${studentRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="5">TOTALS</td>
              <td>MWK ${totals.totalRequired.toLocaleString()}</td>
              <td style="color:#16a34a">MWK ${totals.totalCollected.toLocaleString()}</td>
              <td style="color:#dc2626">MWK ${totals.totalOutstanding.toLocaleString()}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <!-- Footer -->
        <div class="footer">
          ${school.name || "SchoolPay"} &nbsp;|&nbsp; Confidential &nbsp;|&nbsp;
          ${new Date(generatedAt).toLocaleDateString("en-GB")}
        </div>

        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    w.document.close();
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Fees Report</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Generate and export school fees reports
              </p>
            </div>
          </div>
          <Button
            onClick={exportPDF}
            disabled={loading || !report}
            className="flex items-center gap-2 px-6 font-semibold text-white h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg"
          >
            <Printer className="w-4 h-4" />
            Export PDF
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-lg rounded-2xl">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Filter className="w-4 h-4" />
                Filters:
              </div>

              {/* Term */}
              <select
                value={termId}
                onChange={(e) => setTermId(e.target.value)}
                className="h-10 pl-3 pr-8 text-sm bg-white border rounded-xl border-slate-200 focus:border-indigo-400 focus:outline-none"
              >
                <option value="">All Terms</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.year} • {t.name}
                    {t.isActive ? " (Active)" : ""}
                  </option>
                ))}
              </select>

              {/* Class */}
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="h-10 pl-3 pr-8 text-sm bg-white border rounded-xl border-slate-200 focus:border-indigo-400 focus:outline-none"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.stream ? ` ${c.stream}` : ""}
                    {c.year ? ` • ${c.year}` : ""}
                  </option>
                ))}
              </select>

              {/* Status */}
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 pl-3 pr-8 text-sm bg-white border rounded-xl border-slate-200 focus:border-indigo-400 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid in Full</option>
                <option value="partial">Partial</option>
                <option value="no_payment">No Payment</option>
              </select>

              {loading && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {report && (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-none shadow-lg rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-600">
                      Total Students
                    </p>
                    <p className="text-3xl font-bold text-blue-900 mt-1">
                      {report.totals.totalStudents}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-600">
                      Paid in Full
                    </p>
                    <p className="text-3xl font-bold text-emerald-900 mt-1">
                      {report.totals.paidFull}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-full">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-amber-600">
                      Partial
                    </p>
                    <p className="text-3xl font-bold text-amber-900 mt-1">
                      {report.totals.partial}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-full">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg rounded-2xl bg-gradient-to-br from-red-50 to-red-100/50">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-red-600">
                      Debtors
                    </p>
                    <p className="text-3xl font-bold text-red-900 mt-1">
                      {report.totals.debtors}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Money Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-none shadow-lg rounded-2xl">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 rounded-full">
                    <DollarSign className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      Total Collected
                    </p>
                    <p className="text-xl font-bold text-emerald-700">
                      {fmt(report.totals.totalCollected)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg rounded-2xl">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <DollarSign className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      Total Outstanding
                    </p>
                    <p className="text-xl font-bold text-red-700">
                      {fmt(report.totals.totalOutstanding)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg rounded-2xl">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      Total Required
                    </p>
                    <p className="text-xl font-bold text-blue-700">
                      {fmt(report.totals.totalRequired)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary by Class */}
            <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                    <School className="w-4 h-4 text-white" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-800">
                    Summary by Class
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 border-slate-100">
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-600">
                          Class
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-600">
                          Students
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-600">
                          Paid Full
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-600">
                          Partial
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-600">
                          No Payment
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-600">
                          Debtors
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-600">
                          Collected
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-600">
                          Outstanding
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.summary.map((s) => (
                        <tr key={s.classId} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            {s.className}
                          </td>
                          <td className="px-6 py-4 text-slate-700">
                            {s.total}
                          </td>
                          <td className="px-6 py-4 text-emerald-700 font-medium">
                            {s.paidFull}
                          </td>
                          <td className="px-6 py-4 text-amber-700 font-medium">
                            {s.partial}
                          </td>
                          <td className="px-6 py-4 text-slate-700">
                            {s.noPayment}
                          </td>
                          <td className="px-6 py-4 text-red-700 font-medium">
                            {s.debtors}
                          </td>
                          <td className="px-6 py-4 text-emerald-700 font-medium">
                            {fmt(s.collected)}
                          </td>
                          <td className="px-6 py-4 text-red-700 font-medium">
                            {fmt(s.outstanding)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                      <tr>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          TOTAL
                        </td>
                        <td className="px-6 py-4 font-bold">
                          {report.totals.totalStudents}
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-700">
                          {report.totals.paidFull}
                        </td>
                        <td className="px-6 py-4 font-bold text-amber-700">
                          {report.totals.partial}
                        </td>
                        <td className="px-6 py-4 font-bold">
                          {report.totals.noPayment}
                        </td>
                        <td className="px-6 py-4 font-bold text-red-700">
                          {report.totals.debtors}
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-700">
                          {fmt(report.totals.totalCollected)}
                        </td>
                        <td className="px-6 py-4 font-bold text-red-700">
                          {fmt(report.totals.totalOutstanding)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Student List */}
            <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <CardTitle className="text-base font-semibold text-slate-800">
                      Detailed Student List
                    </CardTitle>
                  </div>
                  <span className="text-sm text-slate-500 font-medium">
                    {report.students.length} student
                    {report.students.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 border-slate-100">
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-600">
                          ID
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-600">
                          Student
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-600">
                          Class
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-600">
                          Parent
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-600">
                          Phone
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-600">
                          Required
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-600">
                          Paid
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-600">
                          Balance
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-600">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.students.map((r) => (
                        <tr
                          key={r.studentId}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                            {r.studentCode}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            {r.firstName} {r.lastName}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {r.className || "-"}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {r.guardian || "-"}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {r.guardianPhone || "-"}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-700">
                            {fmt(r.required)}
                          </td>
                          <td className="px-6 py-4 font-medium text-emerald-700">
                            {fmt(r.totalPaid)}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`font-semibold ${r.balance > 0 ? "text-red-700" : "text-emerald-700"}`}
                            >
                              {fmt(r.balance)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status]}`}
                            >
                              {STATUS_LABELS[r.status] || r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {report.students.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-16 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="p-4 rounded-full bg-slate-100">
                                <FileText className="w-10 h-10 text-slate-300" />
                              </div>
                              <p className="text-slate-500 font-medium">
                                No students found
                              </p>
                              <p className="text-slate-400 text-sm">
                                Try adjusting your filters
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-4 font-bold text-slate-900"
                        >
                          TOTALS
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">
                          {fmt(report.totals.totalRequired)}
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-700">
                          {fmt(report.totals.totalCollected)}
                        </td>
                        <td className="px-6 py-4 font-bold text-red-700">
                          {fmt(report.totals.totalOutstanding)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
