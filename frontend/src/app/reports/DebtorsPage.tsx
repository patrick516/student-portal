import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { useApp } from "@/app/state/useApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Search,
  Filter,
  Download,
  Printer,
  FileText,
  DollarSign,
  TrendingUp,
  Users,
  AlertCircle,
  Loader2,
  // ChevronDown,
  CheckCircle,
  XCircle, // Add this import
  // Plus,
  // Minus,
} from "lucide-react";

type Row = {
  studentId: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  className?: string | null;
  invoiceCount: number;
  totalDue: number;
  totalPaid: number;
  balance: number;
  latestInvoice: string | null;
};

type StudentOpt = { id: string; label: string };

type Term = { id: string; name: string; year: number; isActive: boolean };

type TermsResponse = { data: Term[] };
type DebtorsResponse = { data: Row[] };

type StudentApi = {
  id: string;
  studentCode?: string;
  student_code?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  class_name?: string | null;
  class?: {
    id: string;
    name: string;
    stream?: string | null;
    year?: number | null;
  } | null;
};

type StudentsResponse = {
  data: StudentApi[];
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function DebtorsPage() {
  const { selectedClassId, classes } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [asOf, setAsOf] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  // term filter
  const [terms, setTerms] = useState<Term[]>([]);
  const [termId, setTermId] = useState<string>("");

  // student selector
  const [studQuery, setStudQuery] = useState("");
  const [studOpts, setStudOpts] = useState<StudentOpt[]>([]);
  const [student, setStudent] = useState<StudentOpt | null>(null);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  const loadTerms = useCallback(async () => {
    const { data } = await api.get<TermsResponse>("/api/terms");
    const list: Term[] = data.data || [];
    setTerms(list);
    const active = list.find((t) => t.isActive);
    if (active && !termId) setTermId(active.id);
  }, [termId]);

  const searchStudents = useCallback(
    async (searchTerm: string) => {
      if (!searchTerm.trim()) {
        setStudOpts([]);
        return;
      }

      const params: { search: string; classId?: string } = {
        search: searchTerm,
      };
      if (selectedClassId) params.classId = selectedClassId;

      const { data } = await api.get<StudentsResponse>("/api/students", {
        params,
      });

      const opts: StudentOpt[] = (data.data || []).map((s) => {
        const code = s.studentCode ?? s.student_code ?? "";
        const first = s.firstName ?? s.first_name ?? "";
        const last = s.lastName ?? s.last_name ?? "";
        return {
          id: s.id,
          label: `${code} • ${first} ${last}`.trim(),
        };
      });
      setStudOpts(opts);
    },
    [selectedClassId],
  );

  useEffect(() => {
    void loadTerms();
  }, [loadTerms]);

  useEffect(() => {
    if (studQuery.trim()) {
      void searchStudents(studQuery);
    } else {
      setStudOpts([]);
    }
  }, [studQuery, selectedClassId, searchStudents]);

  const load = useCallback(
    async (overrideTermId?: string) => {
      if (!selectedClassId) {
        setRows([]);
        return;
      }
      setLoading(true);
      try {
        const studentsRes = await api.get<StudentsResponse>("/api/students", {
          params: { classId: selectedClassId },
        });
        const students: StudentApi[] = studentsRes.data.data || [];

        let baseRows: Row[] = students.map((s) => {
          const code = s.studentCode ?? s.student_code ?? "";
          const first = s.firstName ?? s.first_name ?? "";
          const last = s.lastName ?? s.last_name ?? "";

          let className: string | null = null;
          if (s.class_name) {
            className = s.class_name;
          } else if (s.class) {
            className =
              s.class.name +
              (s.class.stream ? " " + s.class.stream : "") +
              (s.class.year ? " • " + s.class.year : "");
          }

          return {
            studentId: s.id,
            studentCode: code,
            firstName: first,
            lastName: last,
            className,
            invoiceCount: 0,
            totalDue: 0,
            totalPaid: 0,
            balance: 0,
            latestInvoice: null,
          };
        });

        const params: Record<string, string> = { asOf };
        const effectiveTerm = overrideTermId || termId;
        if (effectiveTerm) params.termId = effectiveTerm;
        if (selectedClassId) params.classId = selectedClassId;

        const { data } = await api.get<DebtorsResponse>(
          "/api/reports/debtors",
          { params },
        );
        const reportRows: Row[] = data?.data || [];
        const byStudentId = new Map<string, Row>();
        reportRows.forEach((r) => byStudentId.set(r.studentId, r));

        baseRows = baseRows.map((r) =>
          byStudentId.has(r.studentId)
            ? {
                ...r,
                invoiceCount: byStudentId.get(r.studentId)!.invoiceCount,
                totalDue: byStudentId.get(r.studentId)!.totalDue,
                totalPaid: byStudentId.get(r.studentId)!.totalPaid,
                balance: byStudentId.get(r.studentId)!.balance,
                latestInvoice: byStudentId.get(r.studentId)!.latestInvoice,
                className:
                  byStudentId.get(r.studentId)!.className ?? r.className,
              }
            : r,
        );

        setRows(baseRows);
      } finally {
        setLoading(false);
      }
    },
    [asOf, selectedClassId, termId],
  );

  useEffect(() => {
    void load();
  }, [selectedClassId, asOf, termId, load]);

  const filtered = useMemo(() => {
    let list = rows;

    if (student) {
      list = list.filter((r) => r.studentId === student.id);
    }

    const s = q.trim().toLowerCase();
    if (!s) return list;

    return list.filter((r) =>
      (r.studentCode + r.firstName + r.lastName + (r.className || ""))
        .toLowerCase()
        .includes(s),
    );
  }, [rows, q, student]);

  const totals = useMemo(() => {
    const due = filtered.reduce((sum, r) => sum + Number(r.totalDue || 0), 0);
    const paid = filtered.reduce((sum, r) => sum + Number(r.totalPaid || 0), 0);
    const bal = filtered.reduce((sum, r) => sum + Number(r.balance || 0), 0);
    const debtors = filtered.filter((r) => r.balance > 0).length;
    const cleared = filtered.filter((r) => r.balance <= 0).length;

    return { due, paid, bal, debtors, cleared };
  }, [filtered]);

  const findTermLabel = () => {
    const t = terms.find((x) => x.id === termId);
    if (!t) return "";
    return `${t.year} • ${t.name}`;
  };

  const findClassLabel = () => {
    const c = classes.find((cls) => cls.id === selectedClassId);
    if (!c) return "";
    return `${c.name}${c.stream ? " " + c.stream : ""}${
      c.year ? " • " + c.year : ""
    }`;
  };

  const exportCSV = () => {
    const headers = [
      "Student Code",
      "Name",
      "Class",
      "Invoices",
      "Required Fee",
      "Total Paid",
      "Balance",
      "Latest Invoice",
    ];
    const lines = filtered.map((r) => [
      r.studentCode,
      `${r.firstName} ${r.lastName}`,
      r.className ?? "",
      r.invoiceCount,
      r.totalDue,
      r.totalPaid,
      r.balance,
      r.latestInvoice
        ? new Date(r.latestInvoice).toISOString().slice(0, 10)
        : "",
    ]);
    const csv = [headers, ...lines]
      .map((l) => l.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `debtors_${asOf}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rowsHtml = filtered
      .map(
        (r) =>
          `<tr>
        <td>${r.studentCode}</td>
        <td>${r.firstName} ${r.lastName}</td>
        <td>${r.className ?? ""}</td>
        <td>${r.invoiceCount}</td>
        <td>${Number(r.totalDue).toLocaleString()}</td>
        <td>${Number(r.totalPaid).toLocaleString()}</td>
        <td>${Number(r.balance).toLocaleString()}</td>
        <td>${
          r.latestInvoice
            ? new Date(r.latestInvoice).toISOString().slice(0, 10)
            : ""
        }</td>
      </tr>`,
      )
      .join("");
    w.document.write(`
      <html><head><title>Debtors as of ${asOf}</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto;padding:24px}
        h1{font-size:18px;margin-bottom:8px}
        .muted{color:#6b7280;font-size:12px;margin-bottom:12px}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
        th{background:#f3f4f6}
        tfoot td{font-weight:600}
      </style>
      </head><body>
        <h1>Debtors Report</h1>
        <div class="muted">
          As of ${asOf}
          ${termId ? ` • Term: ${findTermLabel()}` : ""}
          ${selectedClassId ? ` • Class: ${findClassLabel()}` : ""}
          ${student ? ` • ${student.label}` : ""}
        </div>
        <table>
          <thead>
            <tr>
              <th>Code</th><th>Name</th><th>Class</th>
              <th>Invoices</th><th>Required Fee</th><th>Total Paid</th><th>Balance</th><th>Latest</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="4">Totals</td>
              <td>${totals.due.toLocaleString()}</td>
              <td>${totals.paid.toLocaleString()}</td>
              <td>${totals.bal.toLocaleString()}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-50/30">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="px-3 py-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-200/50 flex items-center justify-center">
              <span className="text-white font-bold text-lg">MK</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-transparent bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text">
                Outstanding Fees Report
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Track student fees, payments, and outstanding balances
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Total Due
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {formatCurrency(totals.due)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-amber-100/50">
                  <TrendingUp className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-600">
                    Total Paid
                  </p>
                  <p className="mt-2 text-2xl font-bold text-emerald-900">
                    {formatCurrency(totals.paid)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-emerald-100">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-red-50 to-red-100/50 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-red-600">
                    Outstanding Balance
                  </p>
                  <p className="mt-2 text-2xl font-bold text-red-900">
                    {formatCurrency(totals.bal)}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-600">
                    Students
                  </p>
                  <p className="mt-2 text-2xl font-bold text-blue-900">
                    <span className="text-red-600">
                      {totals.debtors} debtors
                    </span>{" "}
                    •{" "}
                    <span className="text-emerald-600">
                      {totals.cleared} cleared
                    </span>
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions Card */}
        <Card className="overflow-hidden border-none shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                {/* Date Filter */}
                <div className="relative">
                  <Calendar className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                  <Input
                    type="date"
                    value={asOf}
                    onChange={(e) => setAsOf(e.target.value)}
                    className="pl-10 h-11 border-slate-200 rounded-xl focus:border-amber-400 focus:ring-amber-400/20"
                  />
                </div>

                {/* Term Filter */}
                <div className="relative">
                  <Filter className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                  <select
                    className="w-full pl-10 text-sm bg-white border h-11 rounded-xl border-slate-200 focus:border-amber-400 focus:ring-amber-400/20"
                    value={termId}
                    onChange={(e) => setTermId(e.target.value)}
                  >
                    <option value="">All Terms</option>
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.year} • {t.name}
                        {t.isActive ? " (Active)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Student Filter */}
                <div className="relative">
                  <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                  <Input
                    placeholder="Filter by student…"
                    value={student ? student.label : studQuery}
                    onChange={(e) => {
                      setStudent(null);
                      setStudQuery(e.target.value);
                      setShowStudentDropdown(true);
                    }}
                    onFocus={() => setShowStudentDropdown(true)}
                    className="pl-10 h-11 border-slate-200 rounded-xl focus:border-amber-400 focus:ring-amber-400/20"
                  />
                  {student && (
                    <button
                      onClick={() => {
                        setStudent(null);
                        setStudQuery("");
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-md hover:bg-slate-100"
                    >
                      <XCircle className="w-4 h-4 text-slate-400" />
                    </button>
                  )}

                  {showStudentDropdown && student === null && studQuery && (
                    <div className="absolute z-10 w-full mt-2 overflow-auto bg-white border shadow-lg rounded-xl max-h-60 border-slate-200">
                      {studOpts.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                          <AlertCircle className="w-8 h-8 text-slate-300" />
                          <p className="text-sm font-medium text-slate-500">
                            No students found
                          </p>
                          <p className="text-xs text-slate-400">
                            Try a different search term
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-50/50">
                            Select a student
                          </div>
                          {studOpts.map((opt) => (
                            <div
                              key={opt.id}
                              className="px-4 py-3 text-sm transition-colors border-b cursor-pointer hover:bg-amber-50/50 border-slate-100 last:border-b-0"
                              onClick={() => {
                                setStudent(opt);
                                setStudQuery(opt.label);
                                setShowStudentDropdown(false);
                              }}
                            >
                              <div className="font-medium text-slate-900">
                                {opt.label.split(" • ")[1]}
                              </div>
                              <div className="text-xs text-slate-500">
                                Student Code: {opt.label.split(" • ")[0]}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* General Search */}
                <div className="relative">
                  <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                  <Input
                    placeholder="Search by code, name, class…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="pl-10 h-11 border-slate-200 rounded-xl focus:border-amber-400 focus:ring-amber-400/20"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={exportCSV}
                  className="flex items-center gap-2 px-4 font-semibold h-11 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={exportPDF}
                  className="flex items-center gap-2 px-4 font-semibold h-11 border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl"
                >
                  <Printer className="w-4 h-4" />
                  Print / PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debtors Table Card */}
        <Card className="overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-amber-50/30 border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div>Fee Balance Report</div>
                    <div className="text-sm font-normal text-slate-500">
                      As of{" "}
                      {new Date(asOf).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      {termId && ` • ${findTermLabel()}`}
                      {selectedClassId && ` • Class: ${findClassLabel()}`}
                    </div>
                  </div>
                </div>
              </CardTitle>
              {loading ? (
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                <div className="text-sm font-semibold text-slate-600">
                  {filtered.length} student{filtered.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50/50 border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                      Student Details
                    </th>
                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                      Invoices
                    </th>
                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                      Required Fee
                    </th>
                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                      Total Paid
                    </th>
                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                      Balance
                    </th>
                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                      Latest Invoice
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r) => (
                    <tr
                      key={r.studentId}
                      className="transition-colors hover:bg-slate-50/30 group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex items-center justify-center w-10 h-10 rounded-full ${
                              r.balance > 0
                                ? "bg-gradient-to-br from-red-100 to-orange-100"
                                : "bg-gradient-to-br from-emerald-100 to-green-100"
                            }`}
                          >
                            <span
                              className={`font-semibold ${
                                r.balance > 0
                                  ? "text-red-700"
                                  : "text-emerald-700"
                              }`}
                            >
                              {r.firstName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {r.firstName} {r.lastName}
                            </div>
                            <div className="text-xs text-slate-500">
                              {r.studentCode} • {r.className || "No class"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="px-3 py-1.5 rounded-lg bg-slate-100">
                            <span className="font-semibold text-slate-700">
                              {r.invoiceCount}
                            </span>
                          </div>
                          <span className="text-sm text-slate-500">
                            invoice{r.invoiceCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-700">
                          {formatCurrency(r.totalDue)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-emerald-700">
                          {formatCurrency(r.totalPaid)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className={`px-3 py-1.5 rounded-lg font-semibold ${
                            r.balance > 0
                              ? "bg-red-100 text-red-700"
                              : r.balance < 0
                                ? "bg-blue-100 text-blue-700"
                                : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {formatCurrency(r.balance)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {r.latestInvoice ? (
                          <div className="px-3 py-1.5 rounded-lg bg-slate-100">
                            <span className="text-sm font-medium text-slate-700">
                              {new Date(r.latestInvoice).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 rounded-full bg-slate-100">
                            <DollarSign className="w-12 h-12 text-slate-300" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-600">
                              No debtors found
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                              {q || student
                                ? "Try adjusting your filters"
                                : "All fees are cleared"}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="border-t bg-slate-50/50 border-slate-100">
                  <tr>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      Totals
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-700">
                        {filtered.reduce((sum, r) => sum + r.invoiceCount, 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">
                        {formatCurrency(totals.due)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-emerald-700">
                        {formatCurrency(totals.paid)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={`font-bold ${
                          totals.bal > 0
                            ? "text-red-700"
                            : totals.bal < 0
                              ? "text-blue-700"
                              : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(totals.bal)}
                      </div>
                    </td>
                    <td className="px-6 py-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
