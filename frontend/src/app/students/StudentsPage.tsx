import { useEffect, useState } from "react";
import { api } from "@/api/client";
import { useApp } from "@/app/state/useApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type Row = {
  id: string;
  student_code: string;
  first_name: string;
  last_name: string;
  class_name?: string | null;
};

export default function StudentsPage() {
  const { selectedClassId } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const nav = useNavigate();

  const load = async () => {
    const { data } = await api.get("/api/students", {
      params: { search: q || undefined, classId: selectedClassId || undefined },
    });
    setRows(data.data || []);
  };

  useEffect(() => {
    load();
  }, [selectedClassId]);

  const exportCSV = () => {
    const headers = ["Student Code", "First Name", "Last Name", "Class"];
    const lines = rows.map((r) => [
      r.student_code,
      r.first_name,
      r.last_name,
      r.class_name ?? "",
    ]);
    const csv = [headers, ...lines]
      .map((l) => l.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rowsHtml = rows
      .map(
        (r) =>
          `<tr><td>${r.student_code}</td><td>${r.first_name}</td><td>${
            r.last_name
          }</td><td>${r.class_name ?? ""}</td></tr>`
      )
      .join("");
    w.document.write(`
      <html><head><title>Students</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto;padding:24px}
        h1{font-size:18px;margin-bottom:8px}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
        th{background:#f3f4f6}
      </style>
      </head><body>
        <h1>Students</h1>
        <table>
          <thead><tr><th>Code</th><th>First</th><th>Last</th><th>Class</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  const openProfile = (id: string) => {
    nav(`/app/student-profile?studentId=${encodeURIComponent(id)}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Students</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search by name or code…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="w-72"
          />
          <Button onClick={load}>Search</Button>
          <Button variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Button variant="outline" onClick={exportPDF}>
            Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-2 pr-3">Student Code</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Class</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-b last:border-none">
                    <td className="py-2 pr-3">{s.student_code}</td>
                    <td className="py-2 pr-3">
                      {s.first_name} {s.last_name}
                    </td>
                    <td className="py-2 pr-3">{s.class_name || "-"}</td>
                    <td className="py-2 pr-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openProfile(s.id)}
                      >
                        Profile
                      </Button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-[hsl(var(--muted-foreground))]"
                    >
                      No records
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
