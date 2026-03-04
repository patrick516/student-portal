// frontend/src/app/students/StudentProfilePage.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { useApp } from "@/app/state/useApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Users, 
  Calendar, 
  DollarSign, 
  GraduationCap, 
  ArrowLeft, 
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  UserCircle,
  Award,
  TrendingUp,
  AlertCircle
} from "lucide-react";

type Student = {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  status: string;
  currentClass?: {
    id: string;
    name: string;
    stream?: string | null;
    year?: number | null;
  } | null;
};

type Guardian = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  relation?: string | null;
};

type AttendanceSummary = {
  present: number;
  absent: number;
  late: number;
  total: number;
};

type Invoice = { id: string; amount: number; status: string; issuedAt: string };
type Payment = { id: string; amount: number; paidAt: string };

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

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function StudentProfilePage() {
  const nav = useNavigate();
  const q = useQuery();
  const { selectedClassId } = useApp();

  const studentId = q.get("studentId") || "";

  const [student, setStudent] = useState<Student | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [att, setAtt] = useState<AttendanceSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [result, setResult] = useState<ResultRow | null>(null);
  const [loading, setLoading] = useState(true);

  const classId = useMemo(
    () => student?.currentClass?.id || selectedClassId || "",
    [student, selectedClassId]
  );

  useEffect(() => {
    if (!studentId) return;
    (async () => {
      try {
        setLoading(true);

        // 1) Student details
        const sRes = await api.get(`/api/students/${studentId}`);
        const s: Student = sRes.data.data;
        setStudent(s);

        // 2) Guardians
        const gRes = await api.get("/api/guardians", { params: { studentId } });
        setGuardians(gRes.data.data || []);

        // 3) Attendance summary (last 30 days)
        const aRes = await api.get("/api/attendance/student-summary", {
          params: { studentId, classId: s.currentClass?.id },
        });
        setAtt(aRes.data.data || null);

        // 4) Fees
        const [invRes, payRes] = await Promise.all([
          api.get("/api/fees/invoices", { params: { studentId } }),
          api.get("/api/fees/payments", { params: { studentId } }),
        ]);
        setInvoices(invRes.data.data || []);
        setPayments(payRes.data.data || []);

        // 5) Latest results for this class
        const cid = s.currentClass?.id || selectedClassId;
        if (cid) {
          const rRes = await api.get(`/api/exams/results/class/${cid}`);
          const rows: ResultRow[] = rRes.data.data || [];
          const row = rows.find((r) => r.studentId === studentId) || null;
          setResult(row);
        } else {
          setResult(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId, selectedClassId]);

  const fullName = student ? `${student.firstName} ${student.lastName}` : "";

  const outstanding = useMemo(
    () =>
      invoices
        .filter((i) => i.status !== "paid")
        .reduce((sum, i) => sum + Number(i.amount || 0), 0),
    [invoices]
  );

  const lastPayment = useMemo(() => {
    if (!payments.length) return null;
    const sorted = [...payments].sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
    );
    return sorted[0];
  }, [payments]);

  const handlePrint = () => {
    window.print();
  };

  const attendanceRate = att && att.total > 0 ? ((att.present / att.total) * 100).toFixed(1) : "0";

  if (!studentId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
        <Card className="max-w-md p-8 text-center border-none shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-amber-500" />
          <h2 className="mb-2 text-xl font-bold text-slate-800">No Student Selected</h2>
          <p className="mb-6 text-sm text-slate-600">
            Please select a student from the Students page to view their profile.
          </p>
          <Button 
            onClick={() => nav("/app/students")}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            Go to Students
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center shadow-lg rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 h-14 w-14 shadow-indigo-200/50">
              <User className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-transparent bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text">
                Student Profile
              </h1>
              {student && (
                <p className="mt-1 text-sm text-slate-600">
                  <span className="font-semibold">{fullName}</span> 
                  <span className="mx-2 text-slate-400">•</span>
                  <span className="text-slate-500">{student.studentCode}</span>
                  {student.currentClass && (
                    <>
                      <span className="mx-2 text-slate-400">•</span>
                      <span className="text-slate-500">
                        {student.currentClass.name}
                        {student.currentClass.stream ? ` ${student.currentClass.stream}` : ""}
                        {student.currentClass.year ? ` • ${student.currentClass.year}` : ""}
                      </span>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => nav("/app/students")}
              className="flex items-center gap-2 font-semibold transition-all border-slate-300 hover:bg-slate-100 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button
              onClick={handlePrint}
              className="flex items-center gap-2 font-semibold text-white transition-all shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-indigo-200/50"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 border-4 border-indigo-200 rounded-full border-t-indigo-600 animate-spin"></div>
              <p className="text-sm font-medium text-slate-600">Loading profile...</p>
            </div>
          </div>
        )}

        {!loading && student && (
          <>
            {/* Personal Details & Guardians */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Personal Details Card */}
              <Card className="overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl">
                <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-indigo-50/30 border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                    <UserCircle className="w-5 h-5 text-indigo-600" />
                    Personal Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-indigo-50">
                      <User className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase text-slate-500">Student Code</p>
                      <p className="mt-1 font-semibold text-slate-800">{student.studentCode}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-purple-50">
                      <User className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase text-slate-500">Full Name</p>
                      <p className="mt-1 font-semibold text-slate-800">{fullName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50">
                      {student.status === "active" ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 mt-1 text-xs font-semibold rounded-full ${
                        student.status === "active" 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-red-100 text-red-700"
                      }`}>
                        {student.status === "active" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {student.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase text-slate-500">Current Class</p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {student.currentClass
                          ? `${student.currentClass.name}${
                              student.currentClass.stream ? " " + student.currentClass.stream : ""
                            }`
                          : "Not assigned"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Guardians Card */}
              <Card className="overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl">
                <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-indigo-50/30 border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Guardians
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {guardians.length === 0 ? (
                    <div className="py-8 text-center">
                      <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="font-medium text-slate-600">No guardians added</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Use the Guardians page to add them
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {guardians.map((g) => (
                        <div key={g.id} className="p-4 transition-all border rounded-xl border-slate-100 bg-slate-50/50 hover:bg-slate-100/50">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center w-10 h-10 text-sm font-bold text-white rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
                              {g.name[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-800">{g.name}</p>
                              {g.relation && (
                                <p className="text-xs font-medium capitalize text-slate-500">
                                  {g.relation}
                                </p>
                              )}
                              <div className="mt-2 space-y-1">
                                {g.email && (
                                  <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <Mail className="w-3 h-3" />
                                    <span className="truncate">{g.email}</span>
                                  </div>
                                )}
                                {g.phone && (
                                  <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <Phone className="w-3 h-3" />
                                    <span>{g.phone}</span>
                                  </div>
                                )}
                                {!g.email && !g.phone && (
                                  <p className="text-xs text-slate-400">No contact info</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Attendance & Fees */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Attendance Card */}
              <Card className="overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl">
                <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-indigo-50/30 border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    Attendance (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {att ? (
                    <div className="space-y-4">
                      {/* Attendance Rate */}
                      <div className="p-4 border border-indigo-100 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50">
                        <p className="text-sm font-semibold text-slate-600">Attendance Rate</p>
                        <p className="text-3xl font-bold text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text">
                          {attendanceRate}%
                        </p>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 border rounded-xl border-slate-100 bg-slate-50/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <p className="text-xs font-semibold uppercase text-slate-500">Total Days</p>
                          </div>
                          <p className="text-2xl font-bold text-slate-800">{att.total}</p>
                        </div>
                        <div className="p-4 border rounded-xl border-emerald-100 bg-emerald-50/50">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <p className="text-xs font-semibold uppercase text-emerald-700">Present</p>
                          </div>
                          <p className="text-2xl font-bold text-emerald-700">{att.present}</p>
                        </div>
                        <div className="p-4 border border-red-100 rounded-xl bg-red-50/50">
                          <div className="flex items-center gap-2 mb-1">
                            <XCircle className="w-4 h-4 text-red-600" />
                            <p className="text-xs font-semibold text-red-700 uppercase">Absent</p>
                          </div>
                          <p className="text-2xl font-bold text-red-700">{att.absent}</p>
                        </div>
                        <div className="p-4 border rounded-xl border-amber-100 bg-amber-50/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <p className="text-xs font-semibold uppercase text-amber-700">Late</p>
                          </div>
                          <p className="text-2xl font-bold text-amber-700">{att.late}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="font-medium text-slate-600">No attendance data</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Attendance records will appear here
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Fees Card */}
              <Card className="overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl">
                <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-indigo-50/30 border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                    <DollarSign className="w-5 h-5 text-indigo-600" />
                    Fees Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Outstanding Amount */}
                    <div className={`p-4 border rounded-xl ${
                      outstanding > 0 
                        ? "bg-gradient-to-r from-red-50 to-pink-50 border-red-100" 
                        : "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100"
                    }`}>
                      <p className="text-sm font-semibold text-slate-600">Outstanding Balance</p>
                      <p className={`text-3xl font-bold ${
                        outstanding > 0 ? "text-red-600" : "text-emerald-600"
                      }`}>
                        {outstanding.toLocaleString()}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 border rounded-xl border-slate-100 bg-slate-50/50">
                        <p className="text-xs font-semibold uppercase text-slate-500">Invoices</p>
                        <p className="text-2xl font-bold text-slate-800">{invoices.length}</p>
                      </div>
                      <div className="p-4 border rounded-xl border-slate-100 bg-slate-50/50">
                        <p className="text-xs font-semibold uppercase text-slate-500">Payments</p>
                        <p className="text-2xl font-bold text-slate-800">{payments.length}</p>
                      </div>
                    </div>

                    {/* Last Payment */}
                    {lastPayment ? (
                      <div className="p-4 border border-indigo-100 rounded-xl bg-indigo-50/50">
                        <p className="mb-2 text-xs font-semibold uppercase text-slate-600">Last Payment</p>
                        <p className="text-xl font-bold text-indigo-700">
                          {Number(lastPayment.amount).toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(lastPayment.paidAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 text-center border rounded-xl border-slate-100 bg-slate-50/50">
                        <p className="text-sm text-slate-500">No payments recorded yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Latest Exam Results */}
            <Card className="overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-indigo-50/30 border-slate-100">
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <Award className="w-5 h-5 text-indigo-600" />
                  Latest Exam Results
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {!classId && (
                  <div className="py-8 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-amber-400" />
                    <p className="font-medium text-slate-600">No class assigned</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Assign the student to a class to track results
                    </p>
                  </div>
                )}
                {classId && !result && (
                  <div className="py-8 text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium text-slate-600">No results yet</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Results will appear once assessments are completed
                    </p>
                  </div>
                )}
                {classId && result && (
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-4 border border-indigo-100 rounded-xl bg-indigo-50/50">
                        <p className="text-xs font-semibold uppercase text-slate-600">Total Points</p>
                        <p className="text-2xl font-bold text-indigo-700">{result.totalPoints}</p>
                      </div>
                      <div className="p-4 border border-purple-100 rounded-xl bg-purple-50/50">
                        <p className="text-xs font-semibold uppercase text-slate-600">Total Marks</p>
                        <p className="text-2xl font-bold text-purple-700">{result.totalMarks}</p>
                      </div>
                      <div className={`p-4 border rounded-xl ${
                        result.passed 
                          ? "border-emerald-100 bg-emerald-50/50" 
                          : "border-red-100 bg-red-50/50"
                      }`}>
                        <p className="text-xs font-semibold uppercase text-slate-600">Status</p>
                        <p className={`text-xl font-bold ${result.passed ? "text-emerald-700" : "text-red-700"}`}>
                          {result.passed ? "Passed" : "Failed"}
                        </p>
                      </div>
                    </div>

                    {/* Results Table */}
                    <div className="overflow-hidden border rounded-xl border-slate-200">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-slate-50 border-slate-100">
                              <th className="px-4 py-3 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                                Subject
                              </th>
                              <th className="px-4 py-3 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                                Code
                              </th>
                              <th className="px-4 py-3 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                                Total
                              </th>
                              <th className="px-4 py-3 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                                Grade
                              </th>
                              <th className="px-4 py-3 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                                Points
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {result.subjects.map((s) => (
                              <tr key={s.subjectId} className="transition-colors hover:bg-slate-50/50">
                                <td className="px-4 py-3 font-medium text-slate-800">
                                  {s.subjectName || s.subjectId}
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  {s.subjectCode || "-"}
                                </td>
                                <td className="px-4 py-3 font-semibold text-slate-800">
                                  {s.total}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">
                                    {s.grade}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-semibold text-indigo-600">
                                  {s.points}
                                </td>
                              </tr>
                            ))}
                            {result.subjects.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-500">
                                  No subject results available
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}