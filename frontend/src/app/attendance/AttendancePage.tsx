import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "@/api/client";
import { useApp } from "@/app/state/useApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Printer,
  Loader2,
  CalendarDays,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Row = {
  id: string;
  student_code: string;
  name: string;
  status: "present" | "absent" | "late" | null;
};

type StudentApi = {
  id: string;
  studentCode?: string;
  student_code?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  status?: string | null;
};

type AttendanceApi = {
  id: string;
  student_code: string;
  name: string;
  status: "present" | "absent" | "late" | null;
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function todayISO() {
  return isoDate(new Date());
}
function yesterdayISO() {
  const t = new Date();
  t.setDate(t.getDate() - 1);
  return isoDate(t);
}
function isEditableDateStr(s: string) {
  return s === todayISO() || s === yesterdayISO();
}

const StatusButton = ({
  status,
  currentStatus,
  onClick,
  disabled,
}: {
  status: "present" | "absent" | "late";
  currentStatus: string | null;
  onClick: () => void;
  disabled: boolean;
}) => {
  const config = {
    present: {
      label: "Present",
      activeClass:
        "bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200",
      inactiveClass:
        "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200",
      icon: <CheckCircle className="w-3.5 h-3.5" />,
    },
    absent: {
      label: "Absent",
      activeClass:
        "bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200",
      inactiveClass:
        "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200",
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
    late: {
      label: "Late",
      activeClass:
        "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200",
      inactiveClass:
        "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200",
      icon: <Clock className="w-3.5 h-3.5" />,
    },
  };

  const isActive = currentStatus === status;
  const btnConfig = config[status];

  return (
    <button
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
        isActive ? btnConfig.activeClass : btnConfig.inactiveClass
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {btnConfig.icon}
      {btnConfig.label}
    </button>
  );
};

export default function AttendancePage() {
  const { user, selectedClassId } = useApp();
  const [date, setDate] = useState<string>(todayISO());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const canEdit = user?.role === "teacher";
  const editableNow = canEdit && isEditableDateStr(date);

  const load = useCallback(async () => {
    if (!selectedClassId || !date) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      // 1) Base list from /api/students (single source of truth)
      const studentsRes = await api.get("/api/students", {
        params: { classId: selectedClassId },
      });
      const students: StudentApi[] = studentsRes.data.data || [];

      // Map students to base rows (no attendance yet)
      let baseRows: Row[] = students.map((s) => {
        const code = s.studentCode ?? s.student_code ?? "";
        const first = s.firstName ?? s.first_name ?? "";
        const last = s.lastName ?? s.last_name ?? "";
        return {
          id: s.id,
          student_code: code,
          name: `${first} ${last}`.trim(),
          status: null,
        };
      });

      // 2) Try to fetch attendance; if it fails, we still keep the student list
      try {
        const attendanceRes = await api.get("/api/attendance", {
          params: { classId: selectedClassId, date },
        });
        const attendance: AttendanceApi[] = attendanceRes.data.data || [];
        const statusById = new Map<string, Row["status"]>();
        for (const a of attendance) {
          statusById.set(a.id, a.status);
        }
        baseRows = baseRows.map((r) => ({
          ...r,
          status: statusById.get(r.id) ?? r.status,
        }));
      } catch (err) {
        console.error("Attendance status fetch failed (ignored):", err);
        // keep baseRows as-is (no statuses yet)
      }

      setRows(baseRows);
    } catch (err) {
      console.error("Attendance loadStudents error:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, date]);

  useEffect(() => {
    load();
  }, [load]);

  const presentCount = useMemo(
    () => rows.filter((r) => r.status === "present").length,
    [rows]
  );
  const absentCount = useMemo(
    () => rows.filter((r) => r.status === "absent").length,
    [rows]
  );
  const lateCount = useMemo(
    () => rows.filter((r) => r.status === "late").length,
    [rows]
  );
  const total = rows.length;
  const pct = total ? Math.round((presentCount / total) * 100) : 0;

  const markAll = async (status: "present" | "absent" | "late") => {
    if (!selectedClassId || !editableNow) return;
    await api.put("/api/attendance/mark-all", {
      classId: selectedClassId,
      date,
      status,
    });
    load();
  };

  const markOne = async (
    studentId: string,
    status: "present" | "absent" | "late"
  ) => {
    if (!selectedClassId || !editableNow) return;
    await api.put("/api/attendance/mark", {
      studentId,
      classId: selectedClassId,
      date,
      status,
    });
    setRows((prev) =>
      prev.map((r) => (r.id === studentId ? { ...r, status } : r))
    );
  };

  const exportCSV = () => {
    const headers = ["Student Code", "Name", "Status"];
    const lines = rows.map((r) => [r.student_code, r.name, r.status ?? ""]);
    const csv = [headers, ...lines]
      .map((l) => l.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rowsHtml = rows
      .map(
        (r) =>
          `<tr><td>${r.student_code}</td><td>${r.name}</td><td>${
            r.status ?? ""
          }</td></tr>`
      )
      .join("");
    w.document.write(`
      <html><head><title>Attendance ${date}</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto;padding:24px}
        h1{font-size:18px;margin-bottom:8px}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
        th{background:#f3f4f6}
      </style>
      </head><body>
        <h1>Attendance — ${date}</h1>
        <div style="margin:6px 0 16px 0;color:#6b7280;font-size:12px">Present: ${presentCount}/${total} (${pct}%)</div>
        <table>
          <thead><tr><th>Student Code</th><th>Name</th><th>Status</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  const getDisplayDate = (dateStr: string) => {
    if (dateStr === todayISO()) return "Today";
    if (dateStr === yesterdayISO()) return "Yesterday";
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Attendance Management
            </h1>
            <p className="text-sm text-slate-600">
              Track and manage student attendance records
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Students
                </p>
                <p className="text-2xl font-bold text-slate-900">{total}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Present</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {presentCount}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-100">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Absent</p>
                <p className="text-2xl font-bold text-rose-700">
                  {absentCount}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-rose-100">
                <XCircle className="w-5 h-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Attendance Rate
                </p>
                <p className="text-2xl font-bold text-indigo-700">{pct}%</p>
              </div>
              <div className="p-2 bg-indigo-100 rounded-lg">
                <CalendarDays className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Date Selector */}
          <div className="relative">
            <Calendar className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
            <Input
              type="date"
              value={date}
              min={yesterdayISO()}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 pl-10 pr-4 text-sm border rounded-xl border-slate-300 w-[180px]"
            />
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={exportCSV}
              variant="outline"
              className="flex items-center gap-2 rounded-xl border-slate-300 hover:bg-slate-50"
            >
              <FileText className="w-4 h-4" />
              Export CSV
            </Button>
            <Button
              onClick={exportPDF}
              variant="outline"
              className="flex items-center gap-2 rounded-xl border-slate-300 hover:bg-slate-50"
            >
              <Printer className="w-4 h-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Mark All Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => markAll("present")}
            disabled={!editableNow}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
          >
            <CheckCircle className="w-4 h-4" />
            Mark All Present
          </Button>
          <Button
            onClick={() => markAll("absent")}
            variant="outline"
            disabled={!editableNow}
            className="flex items-center gap-2 rounded-xl border-rose-300 text-rose-700 hover:bg-rose-50"
          >
            <XCircle className="w-4 h-4" />
            Mark All Absent
          </Button>
        </div>
      </div>

      {/* Attendance Table Card */}
      <Card className="overflow-hidden shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg shadow bg-gradient-to-br from-blue-500 to-indigo-600">
                <CalendarDays className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800">
                  {getDisplayDate(date)}
                </CardTitle>
                <div className="text-sm text-slate-600 mt-0.5">
                  {presentCount} out of {total} students present ({pct}%)
                  {lateCount > 0 && ` • ${lateCount} late`}
                </div>
              </div>
            </div>
            <div className="text-sm text-slate-600">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading…
                </div>
              ) : (
                <Badge variant="outline" className="border-slate-300">
                  {editableNow ? "Editable" : "View Only"}
                </Badge>
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
                    Student Code
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Student Name
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Attendance Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="transition-colors duration-200 group hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 text-sm font-semibold text-blue-700 bg-blue-100 rounded-full">
                          {r.student_code[0]}
                        </div>
                        <code className="font-mono text-sm font-semibold text-slate-900">
                          {r.student_code}
                        </code>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{r.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      {canEdit ? (
                        <div className="flex gap-2">
                          <StatusButton
                            status="present"
                            currentStatus={r.status}
                            onClick={() => markOne(r.id, "present")}
                            disabled={!editableNow}
                          />
                          <StatusButton
                            status="absent"
                            currentStatus={r.status}
                            onClick={() => markOne(r.id, "absent")}
                            disabled={!editableNow}
                          />
                          <StatusButton
                            status="late"
                            currentStatus={r.status}
                            onClick={() => markOne(r.id, "late")}
                            disabled={!editableNow}
                          />
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className={`border-slate-300 ${
                            r.status === "present"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : r.status === "absent"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : r.status === "late"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "text-slate-500"
                          }`}
                        >
                          {r.status === "present" && (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          )}
                          {r.status === "absent" && (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {r.status === "late" && (
                            <Clock className="w-3 h-3 mr-1" />
                          )}
                          {r.status?.toUpperCase() || "—"}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={3} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-full bg-slate-100">
                          <Users className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">
                            No students found
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {selectedClassId
                              ? "No students enrolled in this class"
                              : "Please select a class first"}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Information Footer */}
      {!editableNow && canEdit && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 text-amber-600" />
              <div>
                <div className="text-sm font-medium text-amber-800">
                  Editing Restrictions
                </div>
                <div className="text-sm text-amber-700 mt-0.5">
                  Attendance can only be edited for <b>today</b> or{" "}
                  <b>yesterday</b>. To modify attendance for other dates, please
                  contact the system administrator.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
