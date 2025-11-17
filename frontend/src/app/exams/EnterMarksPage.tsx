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

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function EnterMarksPage() {
  // <<--- IMPORTANT DEFAULT EXPORT
  const q = useQuery();
  const classId = q.get("classId") || "";
  const subjectId = q.get("subjectId") || "";

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [assessmentId, setAssessmentId] = useState<string>("");
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [openNewAssess, setOpenNewAssess] = useState(false);
  const [newForm, setNewForm] = useState({
    name: "",
    weight: 20,
    optional: true,
  });

  const loadAssessments = async () => {
    const { data } = await api.get("/api/exams/assessments", {
      params: { classId, subjectId },
    });
    const arr = (data.data || []) as Assessment[];
    setAssessments(arr);
    if (!assessmentId && arr[0]) setAssessmentId(arr[0].id);
  };

  const loadMarks = async () => {
    if (!assessmentId) return;
    const { data } = await api.get("/api/exams/marks", {
      params: { classId, subjectId, assessmentId },
    });
    setRows((data.data || []) as StudentRow[]);
  };

  useEffect(() => {
    loadAssessments();
  }, []);

  useEffect(() => {
    loadMarks();
  }, [assessmentId]);

  const onSaveScore = async (studentId: string, v: string) => {
    const score = Number(v);
    if (Number.isNaN(score)) return;

    await api.put("/api/exams/mark", {
      classId,
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
    await api.post("/api/exams/assessments", {
      classId,
      subjectId,
      name: newForm.name.trim(),
      weight: Number(newForm.weight),
      optional: newForm.optional,
    });

    setOpenNewAssess(false);
    setNewForm({ name: "", weight: 20, optional: true });
    loadAssessments();
  };

  const avg = useMemo(() => {
    const vals = rows.map((r) => r.score ?? 0);
    return vals.length
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : 0;
  }, [rows]);

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
                    disabled={!newForm.name.trim()}
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
                      No students
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
