import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/app/state/useApp";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type SubjectResult = {
  subjectId: string;
  subjectName?: string | null;
  subjectCode?: string | null;
  total: number;
  grade: string;
  points: number;
};

type ResultRow = {
  studentId: string;
  studentCode: string;
  name: string;
  subjects: SubjectResult[];
  bestSix: SubjectResult[];
  totalPoints: number;
  totalMarks: number;
  passed: boolean;
};

type StudentApi = {
  id: string;
  studentCode?: string;
  student_code?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
};

export default function ResultsPage() {
  const { selectedClassId } = useApp();
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    if (!selectedClassId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setNotice(null);
    try {
      // 1) Base student list for this class
      const studentsRes = await api.get("/api/students", {
        params: { classId: selectedClassId },
      });
      const students: StudentApi[] = studentsRes.data.data || [];

      // map to base rows with no results yet
      let baseRows: ResultRow[] = students.map((s) => {
        const code = s.studentCode ?? s.student_code ?? "";
        const first = s.firstName ?? s.first_name ?? "";
        const last = s.lastName ?? s.last_name ?? "";
        const name = `${first} ${last}`.trim();

        return {
          studentId: s.id,
          studentCode: code,
          name,
          subjects: [],
          bestSix: [],
          totalPoints: 0,
          totalMarks: 0,
          passed: false,
        };
      });

      // 2) Try to fetch computed results and overlay
      try {
        const res = await api.get(
          `/api/exams/results/class/${selectedClassId}`
        );
        const resultData: ResultRow[] = (res.data?.data || []) as ResultRow[];

        const byId = new Map<string, ResultRow>();
        resultData.forEach((r) => byId.set(r.studentId, r));

        baseRows = baseRows.map((r) =>
          byId.has(r.studentId) ? byId.get(r.studentId)! : r
        );
      } catch (err: any) {
        const msg =
          err?.response?.data?.error ||
          "No computed results yet. Ensure assessments, marks and grade scheme are configured.";
        setNotice(msg);
        // keep baseRows as just student list with zeroed results
      }

      // sort by totalPoints/marks but keep students without results at the bottom
      baseRows.sort(
        (a, b) =>
          (a.totalPoints || 9999) - (b.totalPoints || 9999) ||
          (b.totalMarks || 0) - (a.totalMarks || 0)
      );

      setRows(baseRows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId]);

  const passRate = useMemo(
    () =>
      rows.length
        ? Math.round((100 * rows.filter((r) => r.passed).length) / rows.length)
        : 0,
    [rows]
  );

  const exportCSV = () => {
    const headers = ["Code", "Name", "Total Points", "Total Marks", "Passed?"];
    const lines = rows.map((r) => [
      r.studentCode,
      r.name,
      r.totalPoints,
      r.totalMarks,
      r.passed ? "Yes" : "No",
    ]);
    const csv = [headers, ...lines]
      .map((l) => l.map((x) => `"${String(x).replace(/"/g, '"')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `results_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rowsHtml = rows
      .map(
        (r) => `
      <tr>
        <td>${r.studentCode}</td>
        <td>${r.name}</td>
        <td>${r.totalPoints}</td>
        <td>${r.totalMarks}</td>
        <td>${r.passed ? "Yes" : "No"}</td>
      </tr>`
      )
      .join("");
    w.document.write(`
      <html><head><title>Class Results</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto;padding:24px}
        h1{font-size:18px;margin-bottom:8px}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
        th{background:#f3f4f6}
      </style>
      </head><body>
        <h1>Class Results</h1>
        <table>
          <thead><tr><th>Code</th><th>Name</th><th>Total Points</th><th>Total Marks</th><th>Passed?</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  const openProfile = (id: string) => {
    window.location.href = `/app/student-profile?studentId=${encodeURIComponent(
      id
    )}`;
  };

  const openReportPack = (id: string) => {
    window.open(
      `/app/student-report-pack?studentId=${encodeURIComponent(id)}`,
      "_blank"
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Results</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Button variant="outline" onClick={exportPDF}>
            Print / PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>
            Overview{" "}
            {loading && (
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                Loading…
              </span>
            )}
          </CardTitle>
          <div className="text-sm">Pass rate: {passRate}%</div>
        </CardHeader>
        <CardContent>
          {notice && (
            <div className="mb-3 text-xs text-[hsl(var(--muted-foreground))]">
              {notice}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-2 pr-3">Code</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Total Points</th>
                  <th className="py-2 pr-3">Total Marks</th>
                  <th className="py-2 pr-3">Passed</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.studentId} className="border-b last:border-none">
                    <td className="py-2 pr-3">{r.studentCode}</td>
                    <td className="py-2 pr-3">{r.name}</td>
                    <td className="py-2 pr-3">
                      {r.subjects.length ? r.totalPoints : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      {r.subjects.length ? r.totalMarks : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      {r.subjects.length ? (r.passed ? "Yes" : "No") : "—"}
                    </td>
                    <td className="flex flex-wrap gap-2 py-2 pr-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openProfile(r.studentId)}
                      >
                        Profile
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReportPack(r.studentId)}
                        disabled={!r.subjects.length}
                      >
                        Report Pack
                      </Button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-[hsl(var(--muted-foreground))]"
                    >
                      No students for this class.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
