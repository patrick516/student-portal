// frontend/src/app/classes/ClassesPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
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

type Klass = {
  id: string;
  name: string;
  stream?: string | null;
  year?: number | null;
  formTeacher?: { id: string; name: string; email: string } | null;
};

type TeacherOpt = { id: string; name: string; email: string };

type SummaryItem = {
  teacher: { id: string; name: string; email: string };
  subjects: { id: string; name: string; code?: string | null }[];
};

type ClassesResponse = { data: Klass[] };
type UsersResponse = {
  data: { id: string; name: string; email: string }[];
};
type SummaryResponse = { data: SummaryItem[] };

export default function ClassesPage() {
  const [rows, setRows] = useState<Klass[]>([]);
  const [q, setQ] = useState("");

  const [openNew, setOpenNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", stream: "", year: "" });

  const [openSetFT, setOpenSetFT] = useState<string | null>(null); // classId
  const [teachers, setTeachers] = useState<TeacherOpt[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

  const [summary, setSummary] = useState<Record<string, SummaryItem[]>>({});

  const loadClasses = useCallback(async () => {
    const { data } = await api.get<ClassesResponse>("/api/classes");
    setRows(data.data || []);
  }, []);

  const loadTeachers = useCallback(async () => {
    const { data } = await api.get<UsersResponse>("/api/users", {
      params: { role: "teacher" },
    });
    const list: TeacherOpt[] = (data.data || []).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
    }));
    setTeachers(list);
  }, []);

  useEffect(() => {
    void loadClasses();
    void loadTeachers();
  }, [loadClasses, loadTeachers]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter((r) =>
      s
        ? `${r.name} ${r.stream || ""} ${r.year || ""} ${
            r.formTeacher?.name || ""
          }`
            .toLowerCase()
            .includes(s)
        : true
    );
  }, [rows, q]);

  const createClass = async () => {
    const payload = {
      name: newForm.name.trim(),
      stream: newForm.stream.trim() || undefined,
      year: newForm.year ? Number(newForm.year) : undefined,
    };
    await api.post("/api/classes", payload);
    setNewForm({ name: "", stream: "", year: "" });
    setOpenNew(false);
    void loadClasses();
  };

  const openSetFormTeacher = (classId: string) => {
    setOpenSetFT(classId);
    const klass = rows.find((c) => c.id === classId);
    if (klass?.formTeacher) {
      setSelectedTeacherId(klass.formTeacher.id);
    } else {
      setSelectedTeacherId("");
    }
  };

  const setFormTeacher = async () => {
    if (!openSetFT || !selectedTeacherId) return;
    await api.put(`/api/classes/${openSetFT}/form-teacher`, {
      teacherId: selectedTeacherId,
    });
    setOpenSetFT(null);
    void loadClasses();
  };

  const refreshSummary = async (classId: string) => {
    const { data } = await api.get<SummaryResponse>(
      `/api/classes/${classId}/summary`
    );
    setSummary((prev) => ({ ...prev, [classId]: data.data || [] }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Classes</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-72"
          />
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button>New Class</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Class</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Name</Label>
                  <Input
                    value={newForm.name}
                    onChange={(e) =>
                      setNewForm({ ...newForm, name: e.target.value })
                    }
                    placeholder="Form 1"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Stream (optional)</Label>
                  <Input
                    value={newForm.stream}
                    onChange={(e) =>
                      setNewForm({ ...newForm, stream: e.target.value })
                    }
                    placeholder="A"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Year (optional)</Label>
                  <Input
                    type="number"
                    value={newForm.year}
                    onChange={(e) =>
                      setNewForm({ ...newForm, year: e.target.value })
                    }
                    placeholder="2025"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpenNew(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createClass} disabled={!newForm.name.trim()}>
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Classes table */}
      <Card className="border-none shadow-sm bg-white/95 rounded-2xl">
        <CardHeader>
          <CardTitle>All Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-2 pr-3">Class</th>
                  <th className="py-2 pr-3">Year</th>
                  <th className="py-2 pr-3">Form Teacher</th>
                  <th className="py-2 pr-3">Teachers &amp; Subjects</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b last:border-none align-top hover:bg-[hsl(var(--muted))]/40 transition-colors"
                  >
                    <td className="py-2 pr-3">
                      {c.name}
                      {c.stream ? ` ${c.stream}` : ""}
                    </td>
                    <td className="py-2 pr-3">{c.year || "-"}</td>
                    <td className="py-2 pr-3">
                      {c.formTeacher ? c.formTeacher.name : "-"}
                    </td>
                    <td className="py-2 pr-3">
                      {(summary[c.id] || []).length === 0 ? (
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          —
                        </span>
                      ) : (
                        (summary[c.id] || []).map((item, idx) => (
                          <div key={idx} className="mb-2">
                            <div className="text-sm font-medium">
                              {item.teacher.name}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.subjects.map((s) => (
                                <span
                                  key={s.id}
                                  className="px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[10px] text-[hsl(var(--muted-foreground))]"
                                >
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => openSetFormTeacher(c.id)}
                        >
                          Set Form Teacher
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => void refreshSummary(c.id)}
                        >
                          Refresh Summary
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-[hsl(var(--muted-foreground))]"
                    >
                      No classes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Set Form Teacher dialog */}
      <Dialog open={!!openSetFT} onOpenChange={(v) => !v && setOpenSetFT(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Form Teacher</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Teacher</Label>
            <select
              className="h-10 rounded-md bg-[hsl(var(--input))] px-3 text-sm outline-none border border-[hsl(var(--border))]"
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
            >
              <option value="">Select a teacher…</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} • {t.email}
                </option>
              ))}
            </select>
            {teachers.length === 0 && (
              <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                No teachers found. Add teachers first.
              </div>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => setOpenSetFT(null)}>
                Cancel
              </Button>
              <Button onClick={setFormTeacher} disabled={!selectedTeacherId}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
