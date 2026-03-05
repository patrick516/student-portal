import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/app/state/useApp";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TrendingUp,
  CheckCircle,
  XCircle,
  Download,
  Printer,
  // User,
  Award,
  BarChart3,
  FileText,
  Hash,
  Search,
  Filter,
  // ChevronRight,
  Eye,
  Trophy,
  Shield,
  // Sparkles,
  Loader2,
  AlertCircle,
  GraduationCap,
  // Percent,
  // Star,
  // BookOpen,
  Target,
  Users,
  // Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

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
  const { selectedClassId, classes } = useApp();
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"points" | "marks" | "name" | "code">(
    "points",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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
          `/api/exams/results/class/${selectedClassId}`,
        );
        const resultData: ResultRow[] = (res.data?.data || []) as ResultRow[];

        const byId = new Map<string, ResultRow>();
        resultData.forEach((r) => byId.set(r.studentId, r));

        baseRows = baseRows.map((r) =>
          byId.has(r.studentId) ? byId.get(r.studentId)! : r,
        );
      } catch (err: any) {
        const msg =
          err?.response?.data?.error ||
          "No computed results yet. Ensure assessments, marks and grade scheme are configured.";
        setNotice(msg);
        // keep baseRows as just student list with zeroed results
      }

      setRows(baseRows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId]);

  // Filter and sort rows
  const filteredRows = useMemo(() => {
    let filtered = [...rows];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.studentCode.toLowerCase().includes(query),
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "points":
          aValue = a.totalPoints;
          bValue = b.totalPoints;
          break;
        case "marks":
          aValue = a.totalMarks;
          bValue = b.totalMarks;
          break;
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "code":
          aValue = a.studentCode.toLowerCase();
          bValue = b.studentCode.toLowerCase();
          break;
        default:
          aValue = a.totalPoints;
          bValue = b.totalPoints;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [rows, searchQuery, sortBy, sortOrder]);

  const passRate = useMemo(
    () =>
      rows.length
        ? Math.round((100 * rows.filter((r) => r.passed).length) / rows.length)
        : 0,
    [rows],
  );

  const averagePoints = useMemo(
    () =>
      rows.filter((r) => r.subjects.length > 0).length
        ? Math.round(
            rows
              .filter((r) => r.subjects.length > 0)
              .reduce((sum, r) => sum + r.totalPoints, 0) /
              rows.filter((r) => r.subjects.length > 0).length,
          )
        : 0,
    [rows],
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

    const currentClass = classes.find((c) => c.id === selectedClassId);
    const className = currentClass
      ? `${currentClass.name}${
          currentClass.stream ? ` ${currentClass.stream}` : ""
        }${currentClass.year ? ` • ${currentClass.year}` : ""}`
      : "Unknown Class";

    const rowsHtml = filteredRows
      .map(
        (r) => `
      <tr>
        <td>${r.studentCode}</td>
        <td>${r.name}</td>
        <td>${r.totalPoints}</td>
        <td>${r.totalMarks}</td>
        <td class="${r.passed ? "passed" : "failed"}">${
          r.passed ? "✓ Yes" : "✗ No"
        }</td>
      </tr>`,
      )
      .join("");

    w.document.write(`
      <html>
        <head>
          <title>Class Results - ${className}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            body{font-family:'Inter',system-ui,sans-serif;padding:32px;color:#111827;background:#f8fafc}
            .report{max-width:1000px;margin:0 auto;background:white;border-radius:16px;padding:40px;box-shadow:0 10px 40px rgba(0,0,0,0.1)}
            .header{text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #e5e7eb}
            h1{font-size:32px;font-weight:700;color:#1e293b;margin:0 0 8px 0}
            .class-info{font-size:14px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em}
            .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0}
            .stat-item{padding:16px;border-radius:12px;background:#f8fafc;border:1px solid #e5e7eb;text-align:center}
            .stat-value{font-size:24px;font-weight:700;color:#1e293b;margin-bottom:4px}
            .stat-label{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em}
            table{border-collapse:collapse;width:100%;margin:24px 0}
            th{background:#f1f5f9;color:#475569;font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:0.05em;padding:12px 16px;text-align:left}
            td{padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#334155}
            .passed{color:#059669;font-weight:600}
            .failed{color:#dc2626;font-weight:600}
            .footer{margin-top:40px;padding-top:24px;border-top:2px solid #e5e7eb;text-align:center;color:#64748b;font-size:12px}
          </style>
        </head>
        <body>
          <div class="report">
            <div class="header">
              <h1>📊 Class Results Summary</h1>
              <div class="class-info">${className}</div>
            </div>
            
            <div class="stats">
              <div class="stat-item">
                <div class="stat-value">${filteredRows.length}</div>
                <div class="stat-label">Total Students</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${passRate}%</div>
                <div class="stat-label">Pass Rate</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${averagePoints}</div>
                <div class="stat-label">Avg Points</div>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Student Code</th>
                  <th>Name</th>
                  <th>Total Points</th>
                  <th>Total Marks</th>
                  <th>Passed</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            
            <div class="footer">
              Generated on ${new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
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

  const openProfile = (id: string) => {
    window.location.href = `/app/student-profile?studentId=${encodeURIComponent(
      id,
    )}`;
  };

  const openReportCard = (id: string) => {
    if (!selectedClassId) return;
    window.open(
      `/app/exams/report-card?classId=${selectedClassId}&studentId=${encodeURIComponent(
        id,
      )}`,
      "_blank",
    );
  };

  const getCurrentClassName = () => {
    if (!selectedClassId) return "Select a Class";
    const currentClass = classes.find((c) => c.id === selectedClassId);
    if (!currentClass) return "Unknown Class";
    return `${currentClass.name}${
      currentClass.stream ? ` ${currentClass.stream}` : ""
    }${currentClass.year ? ` • ${currentClass.year}` : ""}`;
  };

  const getGradeColor = (grade: string) => {
    const gradeLower = grade.toLowerCase();
    if (gradeLower.includes("a") || gradeLower.includes("dist"))
      return "bg-emerald-100 text-emerald-700";
    if (gradeLower.includes("b") || gradeLower.includes("merit"))
      return "bg-blue-100 text-blue-700";
    if (gradeLower.includes("c") || gradeLower.includes("credit"))
      return "bg-amber-100 text-amber-700";
    if (gradeLower.includes("d") || gradeLower.includes("pass"))
      return "bg-orange-100 text-orange-700";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/30">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200/50">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-transparent bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text">
                Class Results
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                View and analyze student performance metrics
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Total Students
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {rows.length}
                  </p>
                </div>
                <div className="p-2.5 rounded-full bg-gradient-to-br from-slate-200 to-slate-300">
                  <Users className="w-5 h-5 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-600">
                    Pass Rate
                  </p>
                  <p className="mt-2 text-2xl font-bold text-emerald-900">
                    {passRate}%
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {rows.filter((r) => r.passed).length} of {rows.length}{" "}
                    passed
                  </p>
                </div>
                <div className="p-2.5 rounded-full bg-gradient-to-br from-emerald-200 to-emerald-300">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-600">
                    Average Points
                  </p>
                  <p className="mt-2 text-2xl font-bold text-blue-900">
                    {averagePoints}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Across {rows.filter((r) => r.subjects.length > 0).length}{" "}
                    students with results
                  </p>
                </div>
                <div className="p-2.5 rounded-full bg-gradient-to-br from-blue-200 to-blue-300">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-600">Class</p>
                  <p className="mt-2 text-xl font-bold truncate text-amber-900">
                    {getCurrentClassName()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Current selection
                  </p>
                </div>
                <div className="p-2.5 rounded-full bg-gradient-to-br from-amber-200 to-amber-300">
                  <GraduationCap className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="overflow-hidden border-none shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                  <Input
                    placeholder="Search students by name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-indigo-400/20"
                  />
                </div>

                {/* Sort By */}
                <div className="relative">
                  <Filter className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                  <select
                    className="w-full pl-10 text-sm bg-white border h-11 rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="points">Sort by Points</option>
                    <option value="marks">Sort by Marks</option>
                    <option value="name">Sort by Name</option>
                    <option value="code">Sort by Code</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div className="flex gap-2">
                  <Button
                    variant={sortOrder === "desc" ? "default" : "outline"}
                    onClick={() => setSortOrder("desc")}
                    className={`flex-1 h-11 ${
                      sortOrder === "desc"
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600"
                        : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                    Descending
                  </Button>
                  <Button
                    variant={sortOrder === "asc" ? "default" : "outline"}
                    onClick={() => setSortOrder("asc")}
                    className={`flex-1 h-11 ${
                      sortOrder === "asc"
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600"
                        : ""
                    }`}
                  >
                    <ChevronUp className="w-4 h-4" />
                    Ascending
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card className="overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-indigo-50/30 border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <div>Student Results</div>
                    <div className="text-sm font-normal text-slate-500">
                      {filteredRows.length} student
                      {filteredRows.length !== 1 ? "s" : ""} shown
                      {notice && " • " + notice}
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
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={exportCSV}
                    disabled={rows.length === 0}
                    className="flex items-center gap-2 px-4 font-semibold h-11 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={exportPDF}
                    disabled={rows.length === 0}
                    className="flex items-center gap-2 px-4 font-semibold text-indigo-700 border-indigo-200 h-11 hover:bg-indigo-50 rounded-xl disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" />
                    Print / PDF
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredRows.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="p-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200">
                  <AlertCircle className="w-12 h-12 text-slate-300" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {loading ? "Loading Results..." : "No Results Found"}
                  </h3>
                  <p className="max-w-md mx-auto mt-2 text-slate-600">
                    {loading
                      ? "Fetching student data and performance results..."
                      : selectedClassId
                        ? "No students or results available for this class."
                        : "Please select a class to view results."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50/50 border-slate-100">
                      <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                        Student
                      </th>
                      <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                        Performance Metrics
                      </th>
                      <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                        Status
                      </th>
                      <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((r, index) => (
                      <tr
                        key={r.studentId}
                        className="transition-colors hover:bg-slate-50/30"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100">
                              <span className="text-sm font-semibold text-indigo-700">
                                {index + 1}
                              </span>
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">
                                {r.name}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Hash className="w-3 h-3" />
                                {r.studentCode}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-4">
                              <div>
                                <div className="text-xs font-semibold tracking-wider uppercase text-slate-500">
                                  Total Points
                                </div>
                                <div className="text-lg font-bold text-slate-900">
                                  {r.subjects.length ? r.totalPoints : "—"}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold tracking-wider uppercase text-slate-500">
                                  Total Marks
                                </div>
                                <div className="text-lg font-bold text-slate-900">
                                  {r.subjects.length ? r.totalMarks : "—"}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold tracking-wider uppercase text-slate-500">
                                  Subjects
                                </div>
                                <div className="text-lg font-bold text-slate-900">
                                  {r.subjects.length || "—"}
                                </div>
                              </div>
                            </div>
                            {r.subjects.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {r.bestSix.slice(0, 3).map((subject) => (
                                  <span
                                    key={subject.subjectId}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(
                                      subject.grade,
                                    )}`}
                                  >
                                    <Award className="w-2.5 h-2.5" />
                                    {subject.grade}
                                  </span>
                                ))}
                                {r.bestSix.length > 3 && (
                                  <span className="text-xs text-slate-500">
                                    +{r.bestSix.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {r.subjects.length ? (
                            <div className="flex items-center gap-2">
                              <div
                                className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                                  r.passed
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {r.passed ? (
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
                              <div className="text-xs text-slate-500">
                                {r.subjects.length} subj
                                {r.subjects.length !== 1 ? "s" : ""}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">
                              No results
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openProfile(r.studentId)}
                              className="px-3 text-xs font-semibold rounded-lg h-9 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1.5" />
                              Profile
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openReportCard(r.studentId)}
                              disabled={!r.subjects.length}
                              className="px-3 text-xs font-semibold text-indigo-700 border-indigo-200 rounded-lg h-9 hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-50"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1.5" />
                              Report Card
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notice Panel */}
        {notice && (
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-r from-amber-50 to-orange-50/30 rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100">
                  <Shield className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-800">
                    Results Notice
                  </h4>
                  <p className="mt-1 text-sm text-amber-700">{notice}</p>
                  <p className="mt-2 text-xs text-amber-600">
                    Ensure all assessments have marks entered and a grade scheme
                    is configured.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
