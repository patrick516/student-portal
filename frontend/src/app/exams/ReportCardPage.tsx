import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/api/client";
import { useApp } from "@/app/state/useApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Printer,
  Download,
  Award,
  BookOpen,
  Trophy,
  CheckCircle,
  XCircle,
  TrendingUp,
  Hash,
  Star,
  BarChart3,
  GraduationCap,
  // Calendar,
  User,
  // FileText,
  // ChevronLeft,
  Loader2,
  AlertCircle,
  // Shield,
  Sparkles,
  Medal,
  // Percent,
  Target,
  Crown,
} from "lucide-react";

type SubjectResult = {
  subjectId: string;
  total: number;
  grade: string;
  points: number;
  subjectName?: string;
  subjectCode?: string;
  maxPossible?: number;
  percentage?: number;
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
  average?: number;
  remarks?: string;
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
  const [subjectsList, setSubjectsList] = useState<
    Record<string, { name: string; code?: string }>
  >({});

  useEffect(() => {
    if (!classId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load results
        const { data } = await api.get(`/api/exams/results/class/${classId}`);
        setResults((data.data || []) as ResultRow[]);

        // Try to load subject names
        try {
          const subjectsRes = await api.get(`/api/subjects`, {
            params: { classId },
          });
          const subjectsData = subjectsRes.data?.data || [];
          const subjectMap: Record<string, { name: string; code?: string }> =
            {};
          subjectsData.forEach((subj: any) => {
            subjectMap[subj.id] = {
              name: subj.name || subj.subjectName || subj.id,
              code: subj.code || subj.subjectCode,
            };
          });
          setSubjectsList(subjectMap);
        } catch (error) {
          // Continue without subject names
          console.log("Could not load subject names");
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [classId]);

  const row = useMemo(
    () => results.find((r) => r.studentId === studentId),
    [results, studentId],
  );

  const rank = useMemo(() => {
    if (!row) return null;
    const sortedResults = [...results].sort(
      (a, b) => b.totalPoints - a.totalPoints,
    );
    const idx = sortedResults.findIndex((r) => r.studentId === row.studentId);
    return idx >= 0 ? idx + 1 : null;
  }, [results, row]);

  const className = useMemo(() => {
    const c = classes.find((c) => c.id === classId);
    if (!c) return "";
    return `${c.name}${c.stream ? " " + c.stream : ""}${
      c.year ? " • " + c.year : ""
    }`;
  }, [classes, classId]);

  const enrichedRow = useMemo(() => {
    if (!row) return null;

    return {
      ...row,
      subjects: row.subjects.map((subject) => ({
        ...subject,
        subjectName: subjectsList[subject.subjectId]?.name || subject.subjectId,
        subjectCode: subjectsList[subject.subjectId]?.code,
        percentage:
          subject.total && subject.maxPossible
            ? (subject.total / subject.maxPossible) * 100
            : undefined,
      })),
      bestSix: row.bestSix.map((subject) => ({
        ...subject,
        subjectName: subjectsList[subject.subjectId]?.name || subject.subjectId,
        subjectCode: subjectsList[subject.subjectId]?.code,
        percentage:
          subject.total && subject.maxPossible
            ? (subject.total / subject.maxPossible) * 100
            : undefined,
      })),
    };
  }, [row, subjectsList]);

  const getGradeColor = (grade: string) => {
    const gradeLower = grade.toLowerCase();
    if (gradeLower.includes("a") || gradeLower.includes("dist"))
      return "from-emerald-500 to-green-500";
    if (gradeLower.includes("b") || gradeLower.includes("merit"))
      return "from-blue-500 to-cyan-500";
    if (gradeLower.includes("c") || gradeLower.includes("credit"))
      return "from-amber-500 to-yellow-500";
    if (gradeLower.includes("d") || gradeLower.includes("pass"))
      return "from-orange-500 to-red-500";
    return "from-slate-500 to-slate-600";
  };

  const handlePrint = () => {
    if (!enrichedRow) return;
    const w = window.open("", "_blank");
    if (!w) return;

    const subjectRows = enrichedRow.subjects
      .map(
        (s) =>
          `<tr>
            <td>${s.subjectName}</td>
            <td>${s.total}</td>
            <td>${s.grade}</td>
            <td>${s.points}</td>
          </tr>`,
      )
      .join("");

    const bestRows = enrichedRow.bestSix
      .map(
        (s) =>
          `<tr>
            <td>${s.subjectName}</td>
            <td>${s.total}</td>
            <td>${s.grade}</td>
            <td>${s.points}</td>
          </tr>`,
      )
      .join("");

    w.document.write(`
      <html>
        <head>
          <title>Report Card - ${enrichedRow.studentCode}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            body{font-family:'Inter',system-ui,sans-serif;padding:32px;color:#111827;background:#f8fafc}
            .report-card{max-width:800px;margin:0 auto;background:white;border-radius:16px;padding:40px;box-shadow:0 10px 40px rgba(0,0,0,0.1)}
            .header{text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #e5e7eb}
            h1{font-size:32px;font-weight:700;color:#1e293b;margin:0 0 8px 0}
            .student-info{font-size:18px;color:#64748b;margin-bottom:16px}
            .class-info{font-size:14px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em}
            .summary-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px;margin:32px 0}
            .summary-item{padding:20px;border-radius:12px;background:#f8fafc;border:1px solid #e5e7eb}
            .summary-value{font-size:28px;font-weight:700;color:#1e293b;margin-bottom:4px}
            .summary-label{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em}
            table{border-collapse:collapse;width:100%;margin:24px 0}
            th{background:#f1f5f9;color:#475569;font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:0.05em;padding:12px 16px;text-align:left}
            td{padding:16px;border-bottom:1px solid #e5e7eb;color:#334155}
            .grade-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;background:#dcfce7;color:#166534}
            .footer{margin-top:40px;padding-top:24px;border-top:2px solid #e5e7eb;text-align:center;color:#64748b;font-size:12px}
            .passed{color:#059669;font-weight:600}
            .failed{color:#dc2626;font-weight:600}
          </style>
        </head>
        <body>
          <div class="report-card">
            <div class="header">
              <h1>📊 Academic Report Card</h1>
              <div class="student-info">
                ${enrichedRow.name} • ${enrichedRow.studentCode}
              </div>
              <div class="class-info">
                ${className}
              </div>
            </div>

            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-value">${enrichedRow.totalPoints}</div>
                <div class="summary-label">Total Points</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">${enrichedRow.totalMarks}</div>
                <div class="summary-label">Total Marks</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">
                  <span class="${enrichedRow.passed ? "passed" : "failed"}">
                    ${enrichedRow.passed ? "PASSED" : "NOT PASSED"}
                  </span>
                </div>
                <div class="summary-label">Status</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">${rank || "N/A"}</div>
                <div class="summary-label">Class Rank</div>
              </div>
            </div>

            <h2 style="font-size:20px;margin:40px 0 20px 0;color:#1e293b">🏆 Best 6 Subjects</h2>
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Grade</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>${
                bestRows ||
                "<tr><td colspan='4' style='text-align:center;padding:32px;color:#94a3b8'>No best-subject data</td></tr>"
              }</tbody>
            </table>

            <h2 style="font-size:20px;margin:40px 0 20px 0;color:#1e293b">📚 All Subjects</h2>
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Grade</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>${
                subjectRows ||
                "<tr><td colspan='4' style='text-align:center;padding:32px;color:#94a3b8'>No subject scores</td></tr>"
              }</tbody>
            </table>

            <div class="footer">
              Generated on ${new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })} • School Management System
            </div>
          </div>
        </body>
      </html>
    `);

    w.document.close();
    w.focus();
    w.print();
  };

  const exportPDF = () => {
    handlePrint(); // For now, use the same print function
  };

  if (!classId || !studentId) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-50/30">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="p-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100">
              <AlertCircle className="w-12 h-12 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Missing Information
              </h1>
              <p className="mt-2 text-slate-600">
                Report card requires both <code>classId</code> and{" "}
                <code>studentId</code> in the URL.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-50/30">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <Loader2 className="w-12 h-12 text-amber-600 animate-spin" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Loading Report Card
              </h1>
              <p className="mt-2 text-slate-600">
                Fetching student results and performance data...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!enrichedRow) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-50/30">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="p-4 rounded-full bg-gradient-to-br from-red-100 to-orange-100">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                No Results Found
              </h1>
              <p className="mt-2 text-slate-600">
                No report card data available for this student.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-50/30">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-200/50">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-transparent bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text">
                Academic Report Card
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Performance summary and subject analysis
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={exportPDF}
              className="flex items-center gap-2 px-4 font-semibold h-11 border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
            <Button
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 font-semibold text-white transition-all shadow-lg h-11 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-xl shadow-amber-200/50 hover:shadow-xl"
            >
              <Printer className="w-4 h-4" />
              Print Report
            </Button>
          </div>
        </div>

        {/* Main Report Card */}
        <div className="space-y-6">
          {/* Student Info Banner */}
          <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-r from-slate-50 to-amber-50/30 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100">
                    <User className="w-8 h-8 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {enrichedRow.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Hash className="w-3.5 h-3.5" />
                        {enrichedRow.studentCode}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <GraduationCap className="w-3.5 h-3.5" />
                        {className}
                      </div>
                      {rank && (
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <TrendingUp className="w-3.5 h-3.5" />
                          Rank: {rank}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    enrichedRow.passed
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {enrichedRow.passed ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        PASSED
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        NOT PASSED
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Summary */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      Total Points
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {enrichedRow.totalPoints}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-full bg-gradient-to-br from-slate-200 to-slate-300">
                    <Target className="w-5 h-5 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-600">
                      Total Marks
                    </p>
                    <p className="mt-2 text-2xl font-bold text-blue-900">
                      {enrichedRow.totalMarks}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-full bg-gradient-to-br from-blue-200 to-blue-300">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-600">
                      Subjects Taken
                    </p>
                    <p className="mt-2 text-2xl font-bold text-emerald-900">
                      {enrichedRow.subjects.length}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-full bg-gradient-to-br from-emerald-200 to-emerald-300">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-purple-600">
                      Class Rank
                    </p>
                    <p className="mt-2 text-2xl font-bold text-purple-900">
                      {rank ? `#${rank}` : "N/A"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      out of {results.length} students
                    </p>
                  </div>
                  <div className="p-2.5 rounded-full bg-gradient-to-br from-purple-200 to-purple-300">
                    <Crown className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subject Performance */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Best 6 Subjects */}
            <Card className="overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-emerald-50/30 border-slate-100">
                <CardTitle className="text-lg font-bold text-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500">
                      <Medal className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div>Top 6 Subjects</div>
                      <div className="text-sm font-normal text-slate-500">
                        Best performing subjects (counted for ranking)
                      </div>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50/50 border-slate-100">
                        <th className="px-6 py-3 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                          Subject
                        </th>
                        <th className="px-6 py-3 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                          Score
                        </th>
                        <th className="px-6 py-3 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                          Grade
                        </th>
                        <th className="px-6 py-3 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                          Points
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {enrichedRow.bestSix.map((subject, index) => (
                        <tr
                          key={subject.subjectId}
                          className="transition-colors hover:bg-slate-50/30"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-green-100">
                                <span className="text-sm font-semibold text-emerald-700">
                                  {index + 1}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">
                                  {subject.subjectName}
                                </div>
                                {subject.subjectCode && (
                                  <div className="text-xs text-slate-500">
                                    {subject.subjectCode}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">
                              {subject.total}
                              {subject.percentage && (
                                <div className="text-xs text-slate-500">
                                  {subject.percentage.toFixed(1)}%
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r ${getGradeColor(
                                subject.grade,
                              )} text-white`}
                            >
                              <Star className="w-3 h-3" />
                              {subject.grade}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">
                              {subject.points}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {enrichedRow.bestSix.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <AlertCircle className="w-8 h-8 text-slate-300" />
                              <p className="font-medium text-slate-600">
                                No best subjects data
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* All Subjects */}
            <Card className="overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50/30 border-slate-100">
                <CardTitle className="text-lg font-bold text-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div>All Subjects Performance</div>
                      <div className="text-sm font-normal text-slate-500">
                        Complete subject-wise breakdown
                      </div>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50/50 border-slate-100">
                        <th className="px-6 py-3 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                          Subject
                        </th>
                        <th className="px-6 py-3 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                          Score
                        </th>
                        <th className="px-6 py-3 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                          Grade
                        </th>
                        <th className="px-6 py-3 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                          Points
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {enrichedRow.subjects.map((subject) => (
                        <tr
                          key={subject.subjectId}
                          className="transition-colors hover:bg-slate-50/30"
                        >
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">
                              {subject.subjectName}
                            </div>
                            {subject.subjectCode && (
                              <div className="text-xs text-slate-500">
                                {subject.subjectCode}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">
                              {subject.total}
                              {subject.percentage && (
                                <div className="text-xs text-slate-500">
                                  {subject.percentage.toFixed(1)}%
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r ${getGradeColor(
                                subject.grade,
                              )} text-white`}
                            >
                              <Award className="w-3 h-3" />
                              {subject.grade}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">
                              {subject.points}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {enrichedRow.subjects.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <AlertCircle className="w-8 h-8 text-slate-300" />
                              <p className="font-medium text-slate-600">
                                No subject scores available
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Remarks Card */}
          <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-lg font-bold text-slate-800">
                    Performance Summary
                  </h3>
                  <p className="text-slate-600">
                    {enrichedRow.passed ? (
                      <>
                        <span className="font-semibold text-emerald-700">
                          {enrichedRow.name}
                        </span>{" "}
                        has achieved a total of{" "}
                        <span className="font-bold text-slate-900">
                          {enrichedRow.totalPoints} points
                        </span>
                        with an average performance across{" "}
                        {enrichedRow.subjects.length} subjects. Ranked{" "}
                        <span className="font-bold text-slate-900">
                          #{rank}
                        </span>{" "}
                        in class. Maintains a{" "}
                        <span className="font-semibold text-emerald-700">
                          passing status
                        </span>
                        .
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-red-700">
                          {enrichedRow.name}
                        </span>{" "}
                        has scored
                        <span className="font-bold text-slate-900">
                          {" "}
                          {enrichedRow.totalPoints} points
                        </span>{" "}
                        across
                        {enrichedRow.subjects.length} subjects, requiring
                        improvement in key areas to achieve passing status.
                        Additional support and focus on weaker subjects is
                        recommended.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
