import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { useApp } from "@/app/state/useApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  latestInvoice: string | null; // null means no invoices yet
};

type StudentOpt = { id: string; label: string };

type Term = { id: string; name: string; year: number; isActive: boolean };

type TermsResponse = { data: Term[] };
type DebtorsResponse = { data: Row[] };

// flexible student shape from /api/students
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
    [selectedClassId]
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
        // 1) Base student list for this class from /api/students
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

        // 2) Overlay financial data from /api/reports/debtors
        const params: Record<string, string> = { asOf };
        const effectiveTerm = overrideTermId || termId;
        if (effectiveTerm) params.termId = effectiveTerm;
        if (selectedClassId) params.classId = selectedClassId;

        const { data } = await api.get<DebtorsResponse>(
          "/api/reports/debtors",
          { params }
        );
        const reportRows: Row[] = data?.data || [];
        const byStudentId = new Map<string, Row>();
        reportRows.forEach((r) => byStudentId.set(r.studentId, r));

        baseRows = baseRows.map((r) =>
          byStudentId.has(r.studentId)
            ? {
                ...r,
                // merge financials from report
                invoiceCount: byStudentId.get(r.studentId)!.invoiceCount,
                totalDue: byStudentId.get(r.studentId)!.totalDue,
                totalPaid: byStudentId.get(r.studentId)!.totalPaid,
                balance: byStudentId.get(r.studentId)!.balance,
                latestInvoice: byStudentId.get(r.studentId)!.latestInvoice,
                className:
                  byStudentId.get(r.studentId)!.className ?? r.className,
              }
            : r
        );

        setRows(baseRows);
      } finally {
        setLoading(false);
      }
    },
    [asOf, selectedClassId, termId]
  );

  useEffect(() => {
    void load();
  }, [selectedClassId, asOf, termId, load]);

  // Apply filters on top of merged rows
  const filtered = useMemo(() => {
    let list = rows;

    // filter by selected student from dropdown
    if (student) {
      list = list.filter((r) => r.studentId === student.id);
    }

    const s = q.trim().toLowerCase();
    if (!s) return list;

    return list.filter((r) =>
      (r.studentCode + r.firstName + r.lastName + (r.className || ""))
        .toLowerCase()
        .includes(s)
    );
  }, [rows, q, student]);

  const totals = useMemo(() => {
    const due = filtered.reduce((sum, r) => sum + Number(r.totalDue || 0), 0);
    const paid = filtered.reduce((sum, r) => sum + Number(r.totalPaid || 0), 0);
    const bal = filtered.reduce((sum, r) => sum + Number(r.balance || 0), 0);
    return { due, paid, bal };
  }, [filtered]);

  const findTermLabel = () => {
    const t = terms.find((x) => x.id === termId);
    if (!t) return "";
    return `${t.year} • ${t.name}${t.isActive ? " (Active)" : ""}`;
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
      </tr>`
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Debtors Report</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* As-of date */}
          <Input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="h-9 w-[170px]"
          />

          {/* Term filter */}
          <select
            className="h-9 rounded-md bg-[hsl(var(--input))] px-3 text-sm border border-[hsl(var(--border))]"
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

          {/* Student selector */}
          <div className="relative">
            <Input
              placeholder="Filter by student…"
              value={student ? student.label : studQuery}
              onChange={(e) => {
                setStudent(null);
                setStudQuery(e.target.value);
              }}
              className="w-72"
            />
            {student === null && studQuery && (
              <div className="absolute z-10 w-full mt-1 overflow-auto bg-white border rounded-md max-h-48">
                {studOpts.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No matches
                  </div>
                )}
                {studOpts.map((opt) => (
                  <div
                    key={opt.id}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      setStudent(opt);
                      setStudQuery(opt.label);
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Free text search */}
          <Input
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-48"
          />

          <Button variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Button variant="outline" onClick={exportPDF}>
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="border-none shadow-sm bg-white/95 rounded-2xl">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>As of {asOf}</CardTitle>
          {loading && (
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              Loading…
            </span>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-2 pr-3">Code</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Class</th>
                  <th className="py-2 pr-3">Invoices</th>
                  <th className="py-2 pr-3">Required Fee</th>
                  <th className="py-2 pr-3">Total Paid</th>
                  <th className="py-2 pr-3">Balance</th>
                  <th className="py-2 pr-3">Latest</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.studentId}
                    className="border-b last:border-none hover:bg-[hsl(var(--muted))]/40 transition-colors"
                  >
                    <td className="py-2 pr-3">{r.studentCode}</td>
                    <td className="py-2 pr-3">
                      {r.firstName} {r.lastName}
                    </td>
                    <td className="py-2 pr-3">{r.className || "-"}</td>
                    <td className="py-2 pr-3">{r.invoiceCount}</td>
                    <td className="py-2 pr-3">
                      {Number(r.totalDue).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">
                      {Number(r.totalPaid).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 font-medium">
                      {Number(r.balance).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">
                      {r.latestInvoice
                        ? new Date(r.latestInvoice).toISOString().slice(0, 10)
                        : "-"}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-[hsl(var(--muted-foreground))]"
                    >
                      No debtors.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td className="py-2 pr-3" colSpan={4}>
                    Totals
                  </td>
                  <td className="py-2 pr-3">{totals.due.toLocaleString()}</td>
                  <td className="py-2 pr-3">{totals.paid.toLocaleString()}</td>
                  <td className="py-2 pr-3">{totals.bal.toLocaleString()}</td>
                  <td className="py-2 pr-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
