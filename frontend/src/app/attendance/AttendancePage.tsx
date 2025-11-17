import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { useApp } from "@/app/state/useApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Row = {
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

export default function AttendancePage() {
  const { user, selectedClassId } = useApp();
  const [date, setDate] = useState<string>(todayISO());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const canEdit = user?.role === "teacher";
  const editableNow = canEdit && isEditableDateStr(date);

  const load = async () => {
    if (!selectedClassId || !date) return;
    setLoading(true);
    try {
      const { data } = await api.get("/api/attendance", {
        params: { classId: selectedClassId, date },
      });
      setRows(data.data || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [selectedClassId, date]);

  const presentCount = useMemo(
    () => rows.filter((r) => r.status === "present").length,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Attendance</h1>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            min={yesterdayISO()}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 w-[180px]"
          />
          <Button onClick={exportCSV} variant="outline">
            Export CSV
          </Button>
          <Button onClick={exportPDF} variant="outline">
            Export PDF
          </Button>
          <Button onClick={() => markAll("present")} disabled={!editableNow}>
            Mark all Present
          </Button>
          <Button
            onClick={() => markAll("absent")}
            variant="outline"
            disabled={!editableNow}
          >
            Mark all Absent
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {date === todayISO()
              ? "Today"
              : date === yesterdayISO()
              ? "Yesterday"
              : date}
            : {presentCount}/{total} present ({pct}%)
          </CardTitle>
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
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-none">
                    <td className="py-2 pr-3">{r.student_code}</td>
                    <td className="py-2 pr-3">{r.name}</td>
                    <td className="py-2 pr-3">
                      {canEdit ? (
                        <div className="inline-flex gap-1">
                          <button
                            className={`px-2 py-1 rounded-md border ${
                              r.status === "present"
                                ? "bg-[hsl(var(--secondary))] text-white"
                                : "bg-[hsl(var(--muted))]"
                            } ${
                              !editableNow
                                ? "opacity-60 cursor-not-allowed"
                                : ""
                            }`}
                            onClick={() =>
                              editableNow && markOne(r.id, "present")
                            }
                            disabled={!editableNow}
                          >
                            Present
                          </button>
                          <button
                            className={`px-2 py-1 rounded-md border ${
                              r.status === "absent"
                                ? "bg-[hsl(var(--destructive))] text-white"
                                : "bg-[hsl(var(--muted))]"
                            } ${
                              !editableNow
                                ? "opacity-60 cursor-not-allowed"
                                : ""
                            }`}
                            onClick={() =>
                              editableNow && markOne(r.id, "absent")
                            }
                            disabled={!editableNow}
                          >
                            Absent
                          </button>
                          <button
                            className={`px-2 py-1 rounded-md border ${
                              r.status === "late"
                                ? "bg-[hsl(var(--accent))] text-white"
                                : "bg-[hsl(var(--muted))]"
                            } ${
                              !editableNow
                                ? "opacity-60 cursor-not-allowed"
                                : ""
                            }`}
                            onClick={() => editableNow && markOne(r.id, "late")}
                            disabled={!editableNow}
                          >
                            Late
                          </button>
                        </div>
                      ) : (
                        <span className="text-[hsl(var(--muted-foreground))]">
                          {r.status ?? "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-8 text-center text-[hsl(var(--muted-foreground))]"
                    >
                      No students for this class.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {!editableNow && canEdit && (
            <div className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">
              Editable only for <b>today</b> or <b>yesterday</b>.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
