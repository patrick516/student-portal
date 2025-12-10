// frontend/src/app/students/StudentProfilePage.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { useApp } from "@/app/state/useApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  if (!studentId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Student Profile</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          No <code>studentId</code> in URL. Use the Students page to open a
          profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Student Profile
          </h1>
          {student && (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {fullName} ({student.studentCode}) •{" "}
              {student.currentClass
                ? `${student.currentClass.name}${
                    student.currentClass.stream
                      ? " " + student.currentClass.stream
                      : ""
                  }${
                    student.currentClass.year
                      ? " • " + student.currentClass.year
                      : ""
                  }`
                : "No class"}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => nav("/app/students")}>
            Back to Students
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            Print Profile
          </Button>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Loading profile…
        </p>
      )}

      {!loading && student && (
        <>
          {/* Personal + Guardians */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-none shadow-sm bg:white/95 bg-white/95 rounded-2xl">
              <CardHeader>
                <CardTitle>Personal Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div>
                  <span className="font-semibold">Code:</span>{" "}
                  <span>{student.studentCode}</span>
                </div>
                <div>
                  <span className="font-semibold">Name:</span>{" "}
                  <span>{fullName}</span>
                </div>
                <div>
                  <span className="font-semibold">Status:</span>{" "}
                  <span>{student.status}</span>
                </div>
                <div>
                  <span className="font-semibold">Class:</span>{" "}
                  <span>
                    {student.currentClass
                      ? `${student.currentClass.name}${
                          student.currentClass.stream
                            ? " " + student.currentClass.stream
                            : ""
                        }`
                      : "-"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/95 rounded-2xl">
              <CardHeader>
                <CardTitle>Guardians</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {guardians.length === 0 ? (
                  <div className="text-[hsl(var(--muted-foreground))]">
                    No guardians added. Use the Guardians page to add them.
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {guardians.map((g) => (
                      <li key={g.id}>
                        <span className="font-semibold">{g.name}</span>{" "}
                        {g.relation && <span>({g.relation})</span>} •{" "}
                        <span>{g.email || g.phone || "No contact"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Attendance + Fees */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-none shadow-sm bg-white/95 rounded-2xl">
              <CardHeader>
                <CardTitle>Attendance (last 30 days)</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {att ? (
                  <div className="space-y-1">
                    <div>
                      <span className="font-semibold">Total days:</span>{" "}
                      <span>{att.total}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Present:</span>{" "}
                      <span>{att.present}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Absent:</span>{" "}
                      <span>{att.absent}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Late:</span>{" "}
                      <span>{att.late}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[hsl(var(--muted-foreground))]">
                    No attendance data yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white/95 rounded-2xl">
              <CardHeader>
                <CardTitle>Fees Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div>
                  <span className="font-semibold">Outstanding:</span>{" "}
                  <span>{outstanding.toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-semibold">Invoices:</span>{" "}
                  <span>{invoices.length}</span>
                </div>
                <div>
                  <span className="font-semibold">Payments:</span>{" "}
                  <span>{payments.length}</span>
                </div>
                {lastPayment ? (
                  <div>
                    <span className="font-semibold">Last Payment:</span>{" "}
                    <span>
                      {Number(lastPayment.amount).toLocaleString()} on{" "}
                      {new Date(lastPayment.paidAt).toLocaleDateString()}
                    </span>
                  </div>
                ) : (
                  <div className="text-[hsl(var(--muted-foreground))]">
                    No payments recorded yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Latest Exam Results */}
          <Card className="border-none shadow-sm bg-white/95 rounded-2xl">
            <CardHeader>
              <CardTitle>Latest Exam Results</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {!classId && (
                <div className="text-[hsl(var(--muted-foreground))]">
                  No class found for this student. Assign the student to a class
                  to track results.
                </div>
              )}
              {classId && !result && (
                <div className="text-[hsl(var(--muted-foreground))]">
                  No results yet. Ensure assessments, marks and a grade scheme
                  are configured.
                </div>
              )}
              {classId && result && (
                <>
                  <p className="mb-2">
                    <span className="font-semibold">Total Points:</span>{" "}
                    {result.totalPoints} &nbsp; | &nbsp;
                    <span className="font-semibold">Total Marks:</span>{" "}
                    {result.totalMarks} &nbsp; | &nbsp;
                    <span className="font-semibold">Passed:</span>{" "}
                    {result.passed ? "Yes" : "No"}
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-left border-b">
                        <tr>
                          <th className="py-1 pr-2">Subject</th>
                          <th className="py-1 pr-2">Code</th>
                          <th className="py-1 pr-2">Total</th>
                          <th className="py-1 pr-2">Grade</th>
                          <th className="py-1 pr-2">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.subjects.map((s) => (
                          <tr
                            key={s.subjectId}
                            className="border-b last:border-none hover:bg-[hsl(var(--muted))]/40 transition-colors"
                          >
                            <td className="py-1 pr-2">
                              {s.subjectName || s.subjectId}
                            </td>
                            <td className="py-1 pr-2">
                              {s.subjectCode || "-"}
                            </td>
                            <td className="py-1 pr-2">{s.total}</td>
                            <td className="py-1 pr-2">{s.grade}</td>
                            <td className="py-1 pr-2">{s.points}</td>
                          </tr>
                        ))}
                        {result.subjects.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-2 text-center text-[hsl(var(--muted-foreground))]"
                            >
                              No subject results.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
