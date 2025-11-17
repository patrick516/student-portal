import { useEffect, useState } from "react";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type Row = {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string | null;
};

export default function MySubjectsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/api/exams/my-subjects");
      setRows(data.data || []);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My Subjects</h1>
      <Card>
        <CardHeader>
          <CardTitle>Classes & Subjects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((r, i) => (
              <div key={i} className="p-3 border rounded-lg">
                <div className="font-medium">{r.className}</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">
                  {r.subjectName}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      nav(
                        `/app/exams/marks?classId=${r.classId}&subjectId=${r.subjectId}`
                      )
                    }
                  >
                    Enter Marks
                  </Button>
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                No assignments
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
