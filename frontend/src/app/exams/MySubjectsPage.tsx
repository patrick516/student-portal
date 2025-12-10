import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/app/state/useApp";

type Row = {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string | null;
};

export default function MySubjectsPage() {
  const { setSelectedClassId, selectedClassId } = useApp(); // ✅ moved inside
  const [rows, setRows] = useState<Row[]>([]);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      const { data }: { data: { data: Row[] } } = await api.get(
        "/api/exams/my-subjects"
      );
      setRows(data.data || []);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!selectedClassId) return rows;
    return rows.filter((r) => r.classId === selectedClassId);
  }, [rows, selectedClassId]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My Subjects</h1>
      <Card>
        <CardHeader>
          <CardTitle>Classes &amp; Subjects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <div
                key={`${r.classId}-${r.subjectId}`}
                className="p-3 border rounded-lg"
              >
                <div className="font-medium">{r.className}</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">
                  {r.subjectName}
                  {r.subjectCode ? ` (${r.subjectCode})` : ""}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedClassId(r.classId);
                      nav(
                        `/app/exams/marks?classId=${r.classId}&subjectId=${r.subjectId}`
                      );
                    }}
                  >
                    Enter Marks
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                {rows.length === 0
                  ? "No assignments"
                  : "No subjects for this class. Try selecting another class."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
