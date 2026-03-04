// frontend/src/app/exams/FormTeacherOverviewPage.tsx
import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { useApp } from "@/app/state/useApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Klass = {
  id: string;
  name: string;
  stream?: string | null;
  year?: number | null;
};
type ResultRow = {
  studentId: string;
  studentCode: string;
  name: string;
  totalPoints: number;
  totalMarks: number;
  passed: boolean;
};

export default function FormTeacherOverviewPage() {
  const { user } = useApp();
  const [classes, setClasses] = useState<Klass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMyClasses = async () => {
    const { data } = await api.get("/api/classes/my-form");
    const list: Klass[] = data.data || [];
    setClasses(list);
    if (!selectedClassId && list[0]) setSelectedClassId(list[0].id);
  };

  const loadResults = async () => {
    if (!selectedClassId) return;
    setLoading(true);
    try {
      const { data } = await api.get(
        `/api/exams/results/class/${selectedClassId}`
      );
      setResults((data.data || []) as ResultRow[]);
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) loadResults();
  }, [selectedClassId]);

  const passRate = useMemo(
    () =>
      results.length
        ? Math.round(
            (100 * results.filter((r) => r.passed).length) / results.length
          )
        : 0,
    [results]
  );

  if (user?.role !== "teacher" && user?.role !== "admin") {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Form Teacher Overview</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Only teachers and admins can view this page.
        </p>
      </div>
    );
  }

  if (user?.role === "teacher" && classes.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Form Teacher Overview</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          You are currently not assigned as a form teacher for any class. The
          Head Teacher can set a form teacher from the Classes page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Form Teacher Overview</h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="h-9 rounded-md bg-[hsl(var(--input))] px-3 text-sm border border-[hsl(var(--border))]"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.stream ? ` ${c.stream}` : ""}
                {c.year ? ` • ${c.year}` : ""}
              </option>
            ))}
            {classes.length === 0 && <option>No classes</option>}
          </select>
        </div>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Class Results</CardTitle>
          {loading && (
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              Loading…
            </span>
          )}
        </CardHeader>
        <CardContent>
          {results.length === 0 && !loading && (
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              No results yet. Ensure assessments and marks are entered and a
              grade scheme is configured.
            </div>
          )}
          {results.length > 0 && (
            <>
              <div className="flex gap-4 mb-3 text-sm">
                <span>
                  Students: <b>{results.length}</b>
                </span>
                <span>
                  Pass rate: <b>{passRate}%</b>
                </span>
                <span>
                  Best:{" "}
                  <b>
                    {results[0].totalPoints} pts ({results[0].totalMarks} marks)
                  </b>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left border-b">
                    <tr>
                      <th className="py-2 pr-3">Code</th>
                      <th className="py-2 pr-3">Name</th>
                      <th className="py-2 pr-3">Total Points</th>
                      <th className="py-2 pr-3">Total Marks</th>
                      <th className="py-2 pr-3">Passed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr
                        key={r.studentId}
                        className="border-b last:border-none"
                      >
                        <td className="py-2 pr-3">{r.studentCode}</td>
                        <td className="py-2 pr-3">{r.name}</td>
                        <td className="py-2 pr-3">{r.totalPoints}</td>
                        <td className="py-2 pr-3">{r.totalMarks}</td>
                        <td className="py-2 pr-3">{r.passed ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open("/app/exams/results", "_self")}
                >
                  Open Full Results Page
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
