// frontend/src/app/exams/EnterMarksPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
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
import { useApp } from "@/app/state/useApp";

type StudentRow = {
  id: string;
  code: string;
  name: string;
  score: number | null;
};

type Assessment = {
  id: string;
  name: string;
  weight: number;
  optional: boolean;
};

type StudentApi = {
  id: string;
  studentCode?: string;
  student_code?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
};

type StudentsResponse = { data: StudentApi[] };

type MarksApiRow = {
  id: string;
  code: string;
  name: string;
  score: number | null;
};

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function EnterMarksPage() {
  const q = useQuery();
  const queryClassId = q.get("classId") || "";
  const subjectId = q.get("subjectId") || "";

  const { selectedClassId } = useApp();

  // effective class = topbar selection if set, otherwise query param
  const effectiveClassId = selectedClassId || queryClassId;

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [assessmentId, setAssessmentId] = useState<string>("");
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [openNewAssess, setOpenNewAssess] = useState(false);
  const [newForm, setNewForm] = useState({
    name: "",
    weight: 20,
    optional: true,
  });

  // ---- Load assessments for this class+subject ----
  const loadAssessments = async () => {
    if (!effectiveClassId || !subjectId) return;
    const { data } = await api.get("/api/exams/assessments", {
      params: { classId: effectiveClassId, subjectId },
    });
    const arr = (data.data || []) as Assessment[];
    setAssessments(arr);
    if (!assessmentId && arr[0]) setAssessmentId(arr[0].id);
  };

  // ---- Core loader: students from /api/students, scores from /api/exams/marks ----
  const loadStudentsAndMarks = async () => {
    if (!effectiveClassId) {
      setRows([]);
      return;
    }

    // 1) Base student list from /api/students (single source of truth)
    const studentsRes = await api.get<StudentsResponse>("/api/students", {
      params: { classId: effectiveClassId },
    });
    const students: StudentApi[] = studentsRes.data.data || [];

    let baseRows: StudentRow[] = students.map((s) => {
      const code = s.studentCode ?? s.student_code ?? "";
      const first = s.firstName ?? s.first_name ?? "";
      const last = s.lastName ?? s.last_name ?? "";
      return {
        id: s.id,
        code,
        name: `${first} ${last}`.trim(),
        score: null,
      };
    });

    // 2) If an assessment is selected, fetch marks and merge into rows
    if (assessmentId && subjectId) {
      const marksRes = await api.get("/api/exams/marks", {
        params: {
          classId: effectiveClassId,
          subjectId,
          assessmentId,
        },
      });
      const marks: MarksApiRow[] = marksRes.data.data || [];
      const scoreById = new Map<string, number | null>();
      marks.forEach((m) => {
        scoreById.set(m.id, m.score);
      });

      baseRows = baseRows.map((r) => ({
        ...r,
        score: scoreById.get(r.id) ?? null,
      }));
    }

    setRows(baseRows);
  };

  useEffect(() => {
    void loadAssessments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveClassId, subjectId]);

  useEffect(() => {
    void loadStudentsAndMarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveClassId, subjectId, assessmentId, selectedClassId]);

  const onSaveScore = async (studentId: string, v: string) => {
    if (!assessmentId || !effectiveClassId || !subjectId) return;
    const score = Number(v);
    if (Number.isNaN(score)) return;

    await api.put("/api/exams/mark", {
      classId: effectiveClassId,
      subjectId,
      assessmentId,
      studentId,
      score,
    });

    setRows((prev) =>
      prev.map((r) => (r.id === studentId ? { ...r, score } : r))
    );
  };

  const addAssessment = async () => {
    if (!effectiveClassId || !subjectId) return;
    await api.post("/api/exams/assessments", {
      classId: effectiveClassId,
      subjectId,
      name: newForm.name.trim(),
      weight: Number(newForm.weight),
      optional: newForm.optional,
    });

    setOpenNewAssess(false);
    setNewForm({ name: "", weight: 20, optional: true });
    await loadAssessments();
    await loadStudentsAndMarks();
  };

  const avg = useMemo(() => {
    const vals = rows.map((r) => r.score ?? 0);
    return vals.length
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : 0;
  }, [rows]);

  const canScore = !!assessmentId && !!effectiveClassId && !!subjectId;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Enter Marks</h1>
        <div className="flex items-center gap-2">
          <select
            value={assessmentId}
            onChange={(e) => setAssessmentId(e.target.value)}
            className="h-9 rounded-md bg-[hsl(var(--input))] px-3 text-sm border"
          >
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} • {a.weight}% {a.optional ? "(opt)" : ""}
              </option>
            ))}
            {assessments.length === 0 && <option>No assessments</option>}
          </select>

          <Dialog open={openNewAssess} onOpenChange={setOpenNewAssess}>
            <DialogTrigger asChild>
              <Button size="sm">New Assessment</Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Assessment</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Name</Label>
                  <Input
                    value={newForm.name}
                    onChange={(e) =>
                      setNewForm({ ...newForm, name: e.target.value })
                    }
                    placeholder="Weekly Test 1"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Weight (%)</Label>
                  <Input
                    type="number"
                    value={newForm.weight}
                    onChange={(e) =>
                      setNewForm({ ...newForm, weight: Number(e.target.value) })
                    }
                  />
                </div>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newForm.optional}
                    onChange={(e) =>
                      setNewForm({ ...newForm, optional: e.target.checked })
                    }
                  />
                  Optional?
                </label>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setOpenNewAssess(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={addAssessment}
                    disabled={!newForm.name.trim() || !effectiveClassId}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="flex justify-between">
          <CardTitle>Scores • Avg {avg}%</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-2 pr-3">Code</th>
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 pr-3">Score</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-none">
                    <td className="py-2 pr-3">{r.code}</td>
                    <td className="py-2 pr-3">{r.name}</td>
                    <td className="py-2 pr-3">
                      <Input
                        type="number"
                        defaultValue={r.score ?? ""}
                        onBlur={(e) => onSaveScore(r.id, e.target.value)}
                        className="w-24 h-8"
                        disabled={!canScore}
                      />
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-8 text-center text-[hsl(var(--muted-foreground))]"
                    >
                      {effectiveClassId
                        ? "No students for this class (or no access/assessments)."
                        : "No class selected."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {!canScore && (
            <div className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">
              Create and select an assessment to start entering scores.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
