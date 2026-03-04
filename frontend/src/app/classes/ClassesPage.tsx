// frontend/src/app/classes/ClassesPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  School,
  Search,
  Users,
  UserPlus,
  RefreshCw,
  Plus,
  Calendar,
  BookOpen,
  UserCheck,
  Filter,
  BarChart3,
  Loader2,
  TrendingUp,
  GraduationCap,
  ChevronRight,
  Mail,
} from "lucide-react";

type Klass = {
  id: string;
  name: string;
  stream?: string | null;
  year?: number | null;
  formTeacher?: { id: string; name: string; email: string } | null;
};

type TeacherOpt = { id: string; name: string; email: string };

type SummaryItem = {
  teacher: { id: string; name: string; email: string };
  subjects: { id: string; name: string; code?: string | null }[];
};

type ClassesResponse = { data: Klass[] };
type UsersResponse = {
  data: { id: string; name: string; email: string }[];
};
type SummaryResponse = { data: SummaryItem[] };

export default function ClassesPage() {
  const [rows, setRows] = useState<Klass[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState<string | null>(null);
  const [statsExpanded, setStatsExpanded] = useState(false);

  const [openNew, setOpenNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", stream: "", year: "" });

  const [openSetFT, setOpenSetFT] = useState<string | null>(null); // classId
  const [teachers, setTeachers] = useState<TeacherOpt[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

  const [summary, setSummary] = useState<Record<string, SummaryItem[]>>({});

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ClassesResponse>("/api/classes");
      setRows(data.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTeachers = useCallback(async () => {
    const { data } = await api.get<UsersResponse>("/api/users", {
      params: { role: "teacher" },
    });
    const list: TeacherOpt[] = (data.data || []).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
    }));
    setTeachers(list);
  }, []);

  useEffect(() => {
    void loadClasses();
    void loadTeachers();
  }, [loadClasses, loadTeachers]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter((r) =>
      s
        ? `${r.name} ${r.stream || ""} ${r.year || ""} ${
            r.formTeacher?.name || ""
          }`
            .toLowerCase()
            .includes(s)
        : true
    );
  }, [rows, q]);

  const createClass = async () => {
    const payload = {
      name: newForm.name.trim(),
      stream: newForm.stream.trim() || undefined,
      year: newForm.year ? Number(newForm.year) : undefined,
    };
    await api.post("/api/classes", payload);
    setNewForm({ name: "", stream: "", year: "" });
    setOpenNew(false);
    void loadClasses();
  };

  const openSetFormTeacher = (classId: string) => {
    setOpenSetFT(classId);
    const klass = rows.find((c) => c.id === classId);
    if (klass?.formTeacher) {
      setSelectedTeacherId(klass.formTeacher.id);
    } else {
      setSelectedTeacherId("");
    }
  };

  const setFormTeacher = async () => {
    if (!openSetFT || !selectedTeacherId) return;
    await api.put(`/api/classes/${openSetFT}/form-teacher`, {
      teacherId: selectedTeacherId,
    });
    setOpenSetFT(null);
    void loadClasses();
  };

  const refreshSummary = async (classId: string) => {
    setSummaryLoading(classId);
    try {
      const { data } = await api.get<SummaryResponse>(
        `/api/classes/${classId}/summary`
      );
      setSummary((prev) => ({ ...prev, [classId]: data.data || [] }));
    } finally {
      setSummaryLoading(null);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalClasses = rows.length;
    const totalTeachers = rows.filter((c) => c.formTeacher).length;
    const uniqueYears = [...new Set(rows.map((c) => c.year).filter(Boolean))]
      .length;
    const totalSubjects = Object.values(summary)
      .flat()
      .reduce((total, item) => total + item.subjects.length, 0);

    // Calculate growth percentages (placeholder data)
    const teacherGrowth =
      totalTeachers > 0 ? Math.round((totalTeachers / rows.length) * 100) : 0;
    const subjectGrowth =
      totalSubjects > 0 ? Math.min(100, Math.round(totalSubjects / 5)) : 0;

    return {
      totalClasses,
      totalTeachers,
      uniqueYears,
      totalSubjects,
      teacherGrowth,
      subjectGrowth,
      growthTrend:
        teacherGrowth > 50 ? "up" : subjectGrowth > 50 ? "up" : "stable",
    };
  }, [rows, summary]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 shadow-lg">
            <School className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Classes Management
            </h1>
            <p className="text-sm text-slate-600">
              Manage all academic classes and assign form teachers
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards with Expandable Details */}
      <Card className="overflow-hidden shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-lg font-semibold text-slate-800">
                Class Statistics
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatsExpanded(!statsExpanded)}
              className="flex items-center gap-1"
            >
              {statsExpanded ? "Show Less" : "Show Details"}
              <ChevronRight
                className={`w-4 h-4 transition-transform ${
                  statsExpanded ? "rotate-90" : ""
                }`}
              />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 border rounded-xl border-slate-200 bg-gradient-to-br from-white to-slate-50">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <School className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +12%
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Classes
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {stats.totalClasses}
                </p>
                {statsExpanded && (
                  <p className="mt-1 text-xs text-slate-500">
                    Active academic classes
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border rounded-xl border-slate-200 bg-gradient-to-br from-white to-emerald-50">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {stats.teacherGrowth}%
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Assigned Teachers
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">
                  {stats.totalTeachers}
                </p>
                {statsExpanded && (
                  <p className="mt-1 text-xs text-slate-500">
                    {stats.totalTeachers} of {stats.totalClasses} classes
                    assigned
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border rounded-xl border-slate-200 bg-gradient-to-br from-white to-amber-50">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-xs font-medium text-slate-500">
                  Current Year
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Academic Years
                </p>
                <p className="mt-1 text-2xl font-bold text-amber-700">
                  {stats.uniqueYears}
                </p>
                {statsExpanded && (
                  <p className="mt-1 text-xs text-slate-500">
                    Unique academic years
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border rounded-xl border-slate-200 bg-gradient-to-br from-white to-purple-50">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {stats.subjectGrowth}%
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Subjects
                </p>
                <p className="mt-1 text-2xl font-bold text-purple-700">
                  {stats.totalSubjects}
                </p>
                {statsExpanded && (
                  <p className="mt-1 text-xs text-slate-500">
                    Across all classes
                  </p>
                )}
              </div>
            </div>
          </div>

          {statsExpanded && (
            <div className="pt-4 mt-6 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-700">
                  Overall Performance
                </div>
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    stats.growthTrend === "up"
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  {stats.growthTrend === "up"
                    ? "Growth Trend: Positive"
                    : "Growth Trend: Stable"}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 mt-3 md:grid-cols-3">
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs font-medium text-slate-600">
                    Teacher Coverage
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                        style={{
                          width: `${
                            (stats.totalTeachers / stats.totalClasses) * 100
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      {stats.totalClasses > 0
                        ? Math.round(
                            (stats.totalTeachers / stats.totalClasses) * 100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs font-medium text-slate-600">
                    Subject Distribution
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-500"
                        style={{
                          width: `${Math.min(
                            100,
                            (stats.totalSubjects / (stats.totalClasses * 5)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      {stats.totalSubjects} total
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs font-medium text-slate-600">
                    Year Distribution
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                        style={{ width: `${(stats.uniqueYears / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      {stats.uniqueYears} years
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controls Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
          <Input
            placeholder="Search classes, teachers, or years…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10 h-11 rounded-xl border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                <Plus className="w-4 h-4" />
                New Class
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                    <School className="w-5 h-5 text-white" />
                  </div>
                  <DialogTitle className="text-lg font-semibold text-slate-800">
                    Create New Class
                  </DialogTitle>
                </div>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    Class Name
                  </Label>
                  <Input
                    value={newForm.name}
                    onChange={(e) =>
                      setNewForm({ ...newForm, name: e.target.value })
                    }
                    placeholder="e.g., Form 1, Grade 10"
                    className="h-11 rounded-xl border-slate-300"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Filter className="w-4 h-4 text-blue-600" />
                    Stream (Optional)
                  </Label>
                  <Input
                    value={newForm.stream}
                    onChange={(e) =>
                      setNewForm({ ...newForm, stream: e.target.value })
                    }
                    placeholder="e.g., A, Science, Arts"
                    className="h-11 rounded-xl border-slate-300"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Academic Year (Optional)
                  </Label>
                  <Input
                    type="number"
                    value={newForm.year}
                    onChange={(e) =>
                      setNewForm({ ...newForm, year: e.target.value })
                    }
                    placeholder="e.g., 2025"
                    className="h-11 rounded-xl border-slate-300"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setOpenNew(false)}
                    className="h-10 px-6 rounded-xl border-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createClass}
                    disabled={!newForm.name.trim()}
                    className="h-10 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    Create Class
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Classes Table Card */}
      <Card className="overflow-hidden shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg shadow bg-gradient-to-br from-indigo-500 to-purple-600">
                <Users className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-lg font-semibold text-slate-800">
                All Classes
              </CardTitle>
            </div>
            <div className="text-sm text-slate-600">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading…
                </div>
              ) : (
                `${filtered.length} class${filtered.length !== 1 ? "es" : ""}`
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5" />
                      Class Details
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      Year
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5" />
                      Form Teacher
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5" />
                      Teachers & Subjects
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="transition-colors duration-200 group hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50">
                            <School className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">
                              {c.name}
                              {c.stream && (
                                <span className="ml-2 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                                  {c.stream}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.year ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
                          <Calendar className="h-3.5 w-3.5" />
                          {c.year}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {c.formTeacher ? (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center rounded-full h-9 w-9 bg-gradient-to-br from-emerald-100 to-emerald-50">
                            <UserCheck className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {c.formTeacher.name}
                            </p>
                            <p className="flex items-center gap-1 text-xs text-slate-500">
                              <Mail className="w-3 h-3" />
                              {c.formTeacher.email}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">
                          Not assigned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {(summary[c.id] || []).length === 0 ? (
                        <span className="text-sm text-slate-400">No data</span>
                      ) : (
                        <div className="max-w-md space-y-3">
                          {(summary[c.id] || []).map((item, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-white border rounded-lg shadow-sm border-slate-200"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span className="font-medium text-slate-900">
                                    {item.teacher.name}
                                  </span>
                                </div>
                                <span className="text-xs text-slate-500">
                                  {item.subjects.length} subject
                                  {item.subjects.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {item.subjects.map((s) => (
                                  <span
                                    key={s.id}
                                    className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-slate-50 to-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200"
                                  >
                                    <BookOpen className="w-3 h-3" />
                                    {s.name}
                                    {s.code && (
                                      <span className="text-xs text-slate-500">
                                        ({s.code})
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2 min-w-[180px]">
                        <Button
                          variant="outline"
                          onClick={() => openSetFormTeacher(c.id)}
                          className="flex items-center gap-2 rounded-lg h-9 border-slate-300 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          {c.formTeacher ? "Change Teacher" : "Assign Teacher"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => void refreshSummary(c.id)}
                          disabled={summaryLoading === c.id}
                          className="flex items-center gap-2 rounded-lg h-9 border-slate-300 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        >
                          {summaryLoading === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Refresh Summary
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-full bg-slate-100">
                          <School className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">
                            {q
                              ? "No matching classes found"
                              : "No classes created yet"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {q
                              ? "Try adjusting your search"
                              : "Create your first class to get started"}
                          </p>
                        </div>
                        {!q && (
                          <Button
                            onClick={() => setOpenNew(true)}
                            className="mt-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Class
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Set Form Teacher Dialog */}
      <Dialog open={!!openSetFT} onOpenChange={(v) => !v && setOpenSetFT(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <DialogTitle className="text-lg font-semibold text-slate-800">
                Set Form Teacher
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-sm font-semibold text-slate-700">
                Select Teacher
              </Label>
              <div className="relative">
                <select
                  className="w-full px-4 text-sm transition-all duration-200 bg-white border shadow-sm cursor-pointer h-11 rounded-xl border-slate-300 hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                >
                  <option value="">Choose a teacher…</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} • {t.email}
                    </option>
                  ))}
                </select>
              </div>
              {teachers.length === 0 && (
                <div className="p-3 mt-1 text-xs rounded-lg text-slate-500 bg-slate-50">
                  No teachers found. Please add teachers from the Users page
                  first.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setOpenSetFT(null)}
                className="h-10 px-6 rounded-xl border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={setFormTeacher}
                disabled={!selectedTeacherId}
                className="h-10 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
              >
                Assign Teacher
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
