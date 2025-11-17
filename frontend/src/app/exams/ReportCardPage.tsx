// frontend/src/app/exams/ReportCardPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/api/client";
import { useApp } from "@/app/state/useApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type SubjectResult = {
  subjectId: string;
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

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function ReportCardPage() {
  const { classes } = useApp();
  const q = useQuery();
  const classId = q.get("classId") || "";
  const studentId = q.get("studentId") || "";

  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classId) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/api/exams/results/class/${classId}`);
        setResults((data.data || []) as ResultRow[]);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [classId]);

  const row = useMemo(
    () => results.find((r) => r.studentId === studentId),
    [results, studentId]
  );

  const rank = useMemo(() => {
    if (!row) return null;
    const idx = results.findIndex((r) => r.studentId === row.studentId);
    return idx >= 0 ? idx + 1 : null;
  }, [results, row]);

  const className = useMemo(() => {
    const c = classes.find((c) => c.id === classId);
    if (!c) return "";
    return `${c.name}${c.stream ? " " + c.stream : ""}${
      c.year ? " • " + c.year : ""
    }`;
  }, [classes, classId]);

  const handlePrint = () => {
    if (!row) return;
    const w = window.open("", "_blank");
    if (!w) return;

    const subjectRows = row.subjects
      .map(
        (s) =>
          `<tr><td>${s.subjectId}</td><td>${s.total}</td><td>${s.grade}</td><td>${s.points}</td></tr>`
      )
      .join("");

    const bestRows = row.bestSix
      .map(
        (s) =>
          `<tr><td>${s.subjectId}</td><td>${s.total}</td><td>${s.grade}</td><td>${s.points}</td></tr>`
      )
      .join("");

    w.document.write(`
      <html>
        <head>
          <title>Report Card - ${row.studentCode}</title>
          <style>
            body{font-family:system-ui,-apple-system,Segoe UI,Roboto;padding:24px;color:#111827}
            h1{font-size:20px;margin-bottom:4px}
            h2{font-size:16px;margin:16px 0 8px 0}
            .muted{color:#6b7280;font-size:12px;margin-bottom:8px}
            table{border-collapse:collapse;width:100%;margin-top:8px}
            th,td{border:1px solid #e5e7eb;padding:6px 8px;font-size:12px;text-align:left}
            th{background:#f3f4f6}
            .summary{margin-top:12px;font-size:13px}
          </style>
        </head>
        <body>
          <h1>Report Card</h1>
          <div class="muted">${className}</div>
          <div class="summary">
            <div><b>Student:</b> ${row.name} (${row.studentCode})</div>
            <div><b>Total Points:</b> ${
              row.totalPoints
            } &nbsp; | &nbsp; <b>Total Marks:</b> ${row.totalMarks}</div>
            <div><b>Passed:</b> ${row.passed ? "Yes" : "No"}${
      rank ? " &nbsp; | &nbsp; <b>Class Rank:</b> " + rank : ""
    }</div>
          </div>

          <h2>All Subjects</h2>
          <table>
            <thead>
              <tr><th>Subject</th><th>Total</th><th>Grade</th><th>Points</th></tr>
            </thead>
            <tbody>${
              subjectRows || "<tr><td colspan='4'>No subjects</td></tr>"
            }</tbody>
          </table>

          <h2>Best 6 Subjects</h2>
          <table>
            <thead>
              <tr><th>Subject</th><th>Total</th><th>Grade</th><th>Points</th></tr>
            </thead>
            <tbody>${
              bestRows || "<tr><td colspan='4'>No data</td></tr>"
            }</tbody>
          </table>
        </body>
      </html>
    `);

    w.document.close();
    w.focus();
    w.print();
  };

  if (!classId || !studentId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Report Card</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Missing <code>classId</code> or <code>studentId</code> in the URL.
        </p>
      </div>
    );
  }

  if (loading || !row) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Report Card</h1>
        {loading ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Loading…
          </p>
        ) : (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            No result found for this student.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Report Card</h1>
        <Button variant="outline" onClick={handlePrint}>
          Print / PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {row.name} – {row.studentCode}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
            {className}
          </p>
          <p className="mb-2 text-sm">
            <b>Total Points:</b> {row.totalPoints} &nbsp; | &nbsp;
            <b>Total Marks:</b> {row.totalMarks} &nbsp; | &nbsp;
            <b>Passed:</b> {row.passed ? "Yes" : "No"}{" "}
            {rank && (
              <>
                {" "}
                &nbsp; | &nbsp; <b>Rank:</b> {rank}
              </>
            )}
          </p>

          <h2 className="mt-4 mb-2 text-sm font-semibold">Best 6 Subjects</h2>
          <div className="mb-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-1 pr-2">Subject</th>
                  <th className="py-1 pr-2">Total</th>
                  <th className="py-1 pr-2">Grade</th>
                  <th className="py-1 pr-2">Points</th>
                </tr>
              </thead>
              <tbody>
                {row.bestSix.map((s) => (
                  <tr key={s.subjectId} className="border-b last:border-none">
                    <td className="py-1 pr-2">{s.subjectId}</td>
                    <td className="py-1 pr-2">{s.total}</td>
                    <td className="py-1 pr-2">{s.grade}</td>
                    <td className="py-1 pr-2">{s.points}</td>
                  </tr>
                ))}
                {row.bestSix.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-2 text-center text-[hsl(var(--muted-foreground))]"
                    >
                      No best-subject data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 className="mt-4 mb-2 text-sm font-semibold">All Subjects</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-1 pr-2">Subject</th>
                  <th className="py-1 pr-2">Total</th>
                  <th className="py-1 pr-2">Grade</th>
                  <th className="py-1 pr-2">Points</th>
                </tr>
              </thead>
              <tbody>
                {row.subjects.map((s) => (
                  <tr key={s.subjectId} className="border-b last:border-none">
                    <td className="py-1 pr-2">{s.subjectId}</td>
                    <td className="py-1 pr-2">{s.total}</td>
                    <td className="py-1 pr-2">{s.grade}</td>
                    <td className="py-1 pr-2">{s.points}</td>
                  </tr>
                ))}
                {row.subjects.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-2 text-center text-[hsl(var(--muted-foreground))]"
                    >
                      No subject scores.
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
