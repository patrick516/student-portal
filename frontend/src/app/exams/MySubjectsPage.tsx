import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/app/state/useApp";
import {
  BookOpen,
  GraduationCap,
  Hash,
  ChevronRight,
  Users,
  Filter,
  PlusCircle,
  BarChart3,
  Clock,
  Award,
  Search,
  Loader2,
  AlertCircle,
  Calendar,
  FileText,
  Sparkles,
  Bookmark,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Row = {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string | null;
  studentCount?: number;
  termName?: string;
  academicYear?: number;
};

export default function MySubjectsPage() {
  const { setSelectedClassId, selectedClassId, classes } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    const loadMySubjects = async () => {
      setLoading(true);
      try {
        const { data }: { data: { data: Row[] } } = await api.get(
          "/api/exams/my-subjects"
        );
        setRows(data.data || []);
      } catch (error) {
        console.error("Failed to load subjects:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMySubjects();
  }, []);

  const filtered = useMemo(() => {
    let result = rows;

    // Filter by selected class
    if (selectedClassId) {
      result = result.filter((r) => r.classId === selectedClassId);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.className.toLowerCase().includes(query) ||
          r.subjectName.toLowerCase().includes(query) ||
          r.subjectCode?.toLowerCase().includes(query) ||
          r.termName?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [rows, selectedClassId, searchQuery]);

  // Group by class for better organization
  const groupedByClass = useMemo(() => {
    const groups: Record<string, Row[]> = {};
    filtered.forEach((row) => {
      if (!groups[row.classId]) {
        groups[row.classId] = [];
      }
      groups[row.classId].push(row);
    });
    return groups;
  }, [filtered]);

  // Get current class name
  const currentClassName = useMemo(() => {
    if (!selectedClassId) return null;
    const cls = classes.find((c) => c.id === selectedClassId);
    return cls ? `${cls.name}${cls.stream ? ` ${cls.stream}` : ""}` : null;
  }, [selectedClassId, classes]);

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-200/50">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-transparent bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text">
                My Subjects
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage subjects and enter student marks
              </p>
            </div>
          </div>
        </div>

        {/* Filters and Stats Card */}
        <Card className="overflow-hidden border-none shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
                {/* Class Filter */}
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                    <div className="flex items-center gap-1">
                      <GraduationCap className="w-4 h-4" />
                      Filter by Class
                    </div>
                  </Label>
                  <select
                    className="w-full px-3 text-sm bg-white border h-11 rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20"
                    value={selectedClassId || ""}
                    onChange={(e) => setSelectedClassId(e.target.value || null)}
                  >
                    <option value="">All Classes</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                        {cls.stream ? ` ${cls.stream}` : ""}
                        {cls.year ? ` • ${cls.year}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search */}
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                    <div className="flex items-center gap-1">
                      <Search className="w-4 h-4" />
                      Search Subjects
                    </div>
                  </Label>
                  <div className="relative">
                    <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                    <Input
                      placeholder="Search by class, subject, or code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-blue-400/20"
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      {filtered.length}
                    </div>
                    <div className="text-xs font-semibold tracking-wider uppercase text-slate-500">
                      Subject{filtered.length !== 1 ? "s" : ""} Assigned
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card className="overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50/30 border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div>My Subjects & Assignments</div>
                    <div className="text-sm font-normal text-slate-500">
                      {selectedClassId && currentClassName
                        ? `Filtered by: ${currentClassName}`
                        : "All assigned classes and subjects"}
                    </div>
                  </div>
                </div>
              </CardTitle>
              {loading && (
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-10 h-10 mb-4 text-blue-600 animate-spin" />
                <p className="font-medium text-slate-600">
                  Loading your subjects...
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Fetching your teaching assignments
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="p-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
                  <BookOpen className="w-12 h-12 text-blue-300" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {searchQuery || selectedClassId
                      ? "No Matching Subjects Found"
                      : "No Subjects Assigned"}
                  </h3>
                  <p className="max-w-md mx-auto mt-2 text-slate-600">
                    {searchQuery || selectedClassId
                      ? "Try adjusting your filters or search terms"
                      : "You haven't been assigned to any subjects yet. Contact your administrator for assignments."}
                  </p>
                </div>
                {(searchQuery || selectedClassId) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedClassId(null);
                      setSearchQuery("");
                    }}
                    className="mt-4"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedByClass).map(
                  ([classId, classSubjects]) => {
                    const firstSubject = classSubjects[0];
                    const classInfo = classes.find((c) => c.id === classId);

                    return (
                      <div key={classId} className="space-y-4">
                        {/* Class Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100">
                              <GraduationCap className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">
                                {firstSubject.className}
                              </h3>
                              {classInfo && (
                                <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                  {classInfo.year && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      Year {classInfo.year}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {classSubjects.length} subject
                                    {classSubjects.length !== 1 ? "s" : ""}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Subjects Grid */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {classSubjects.map((subject) => (
                            <div
                              key={`${subject.classId}-${subject.subjectId}`}
                              className="relative overflow-hidden transition-all duration-300 bg-white border group border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-lg"
                            >
                              <div className="absolute top-0 right-0 w-16 h-16 transition-transform duration-300 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-blue-500/10 to-indigo-500/10 group-hover:scale-125" />

                              <div className="relative p-5">
                                {/* Subject Header */}
                                <div className="flex items-start justify-between mb-4">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <BookOpen className="w-4 h-4 text-blue-500" />
                                      <h4 className="text-lg font-bold text-slate-900">
                                        {subject.subjectName}
                                      </h4>
                                    </div>
                                    {subject.subjectCode && (
                                      <div className="flex items-center gap-1 text-sm text-slate-500">
                                        <Hash className="w-3 h-3" />
                                        {subject.subjectCode}
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-2 transition-colors rounded-lg bg-blue-50 group-hover:bg-blue-100">
                                    <Award className="w-5 h-5 text-blue-600" />
                                  </div>
                                </div>

                                {/* Subject Details */}
                                <div className="mb-6 space-y-2">
                                  {subject.termName && (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{subject.termName}</span>
                                      {subject.academicYear && (
                                        <span className="text-slate-400">
                                          •
                                        </span>
                                      )}
                                      {subject.academicYear && (
                                        <span>{subject.academicYear}</span>
                                      )}
                                    </div>
                                  )}
                                  {subject.studentCount !== undefined && (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                      <Users className="w-3.5 h-3.5 text-slate-400" />
                                      <span>
                                        {subject.studentCount} students
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => {
                                      setSelectedClassId(subject.classId);
                                      nav(
                                        `/app/exams/marks?classId=${subject.classId}&subjectId=${subject.subjectId}`
                                      );
                                    }}
                                    className="flex-1 h-10 transition-all rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 group-hover:shadow-lg"
                                  >
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    Enter Marks
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-10 px-3 rounded-lg border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                                    onClick={() => {
                                      setSelectedClassId(subject.classId);
                                      nav(
                                        `/app/exams/marks?classId=${subject.classId}&subjectId=${subject.subjectId}&view=analytics`
                                      );
                                    }}
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Footer */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">
                    Recent Activity
                  </h4>
                  <p className="text-sm text-slate-500">
                    Track last marks entered
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-emerald-50 to-green-50/50 rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500">
                  <PlusCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">
                    Add Assessment
                  </h4>
                  <p className="text-sm text-slate-500">
                    Create new exams or tests
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">
                    Grade Schemes
                  </h4>
                  <p className="text-sm text-slate-500">
                    Manage grading criteria
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
