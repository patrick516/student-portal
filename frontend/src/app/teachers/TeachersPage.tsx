import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { useApp } from "@/app/state/useApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  mustChangePassword?: boolean;
};

type Klass = {
  id: string;
  name: string;
  stream?: string | null;
  year?: number | null;
};
type Subject = { id: string; name: string };
type AssignmentItem = { classId: string; subjectId: string };

type AllocSummaryItem = {
  className: string;
  subjects: string[];
};

export default function TeachersPage() {
  const { classes } = useApp();

  const [rows, setRows] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allocSummary, setAllocSummary] = useState<
    Record<string, AllocSummaryItem[]>
  >({});

  // Add teacher dialog
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    staffCode: "",
    phone: "",
  });
  const [createdTemp, setCreatedTemp] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  // Allocate classes
  const [openAllocate, setOpenAllocate] = useState<string | null>(null);
  const [allocated, setAllocated] = useState<string[]>([]);

  // Assign subjects × classes
  const [openAssign, setOpenAssign] = useState<string | null>(null);
  const [assignMatrix, setAssignMatrix] = useState<AssignmentItem[]>([]);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/users", {
        params: { role: "teacher" },
      });
      const list: UserRow[] = data.data || [];
      setRows(list);
      await loadAllocSummary(list);
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async () => {
    try {
      const { data } = await api.get("/api/subjects");
      setSubjects(data.data || []);
    } catch {
      setSubjects([]);
    }
  };

  const loadAllocSummary = async (teachers: UserRow[]) => {
    const result: Record<string, AllocSummaryItem[]> = {};

    await Promise.all(
      teachers.map(async (t) => {
        try {
          const { data } = await api.get(`/api/users/${t.id}/assignments`);
          const arr: any[] = data.data || [];
          const byClass = new Map<
            string,
            { className: string; subjects: Set<string> }
          >();

          arr.forEach((a) => {
            const clsName = `${a.klass?.name || ""}${
              a.klass?.stream ? " " + a.klass.stream : ""
            }`;
            if (!byClass.has(a.klass.id)) {
              byClass.set(a.klass.id, {
                className: clsName,
                subjects: new Set<string>(),
              });
            }
            byClass.get(a.klass.id)!.subjects.add(a.subject.name);
          });

          result[t.id] = Array.from(byClass.values()).map((v) => ({
            className: v.className,
            subjects: Array.from(v.subjects),
          }));
        } catch {
          result[t.id] = [];
        }
      })
    );

    setAllocSummary(result);
  };

  useEffect(() => {
    loadTeachers();
    loadSubjects();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        q ? (r.name + r.email).toLowerCase().includes(q.toLowerCase()) : true
      ),
    [rows, q]
  );

  const addTeacher = async () => {
    setAddError(null);
    try {
      const res = await api.post("/api/users", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: "teacher",
        staffCode: form.staffCode.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      const data = res.data as any;
      setCreatedTemp(data?.tempPassword ?? form.password);
      setForm({ name: "", email: "", password: "", staffCode: "", phone: "" });
      setOpenAdd(false);
      await loadTeachers();
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error;
      if (status === 409) {
        setAddError(
          msg || "Email already in use. Please use a different email."
        );
      } else if (status === 400) {
        setAddError(msg || "Invalid input. Please check all fields.");
      } else {
        setAddError(msg || "Failed to add teacher. Please try again.");
      }
      console.error("addTeacher error:", err);
    }
  };

  const toggleActive = async (u: UserRow) => {
    await api.put(`/api/users/${u.id}`, { isActive: !u.isActive });
    loadTeachers();
  };

  // Allocate to Class
  const openAllocateFor = async (teacherId: string) => {
    setOpenAllocate(teacherId);
    const { data } = await api.get(`/api/users/${teacherId}/classes`);
    const current: Klass[] = data.data || [];
    setAllocated(current.map((c) => c.id));
  };

  const toggleAlloc = (id: string) => {
    setAllocated((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const saveAllocate = async () => {
    if (!openAllocate) return;
    await api.put(`/api/users/${openAllocate}/classes`, {
      classIds: allocated,
    });
    setOpenAllocate(null);
    loadTeachers();
  };

  // Assign subjects × classes
  const openAssignFor = async (teacherId: string) => {
    setOpenAssign(teacherId);
    const { data } = await api.get(`/api/users/${teacherId}/assignments`);
    const existing = ((data.data || []) as any[]).map((x) => ({
      classId: x.klass.id,
      subjectId: x.subject.id,
    }));
    setAssignMatrix(existing);
  };

  const isChecked = (classId: string, subjectId: string) =>
    assignMatrix.some(
      (p) => p.classId === classId && p.subjectId === subjectId
    );

  const togglePair = (classId: string, subjectId: string) => {
    setAssignMatrix((prev) => {
      const exists = prev.some(
        (p) => p.classId === classId && p.subjectId === subjectId
      );
      return exists
        ? prev.filter(
            (p) => !(p.classId === classId && p.subjectId === subjectId)
          )
        : [...prev, { classId, subjectId }];
    });
  };

  const saveAssign = async () => {
    if (!openAssign) return;
    await api.put(`/api/users/${openAssign}/assignments`, {
      items: assignMatrix,
    });
    setOpenAssign(null);
    loadTeachers();
  };

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Teachers</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-72"
          />
          <Dialog
            open={openAdd}
            onOpenChange={(open) => {
              setOpenAdd(open);
              if (open) {
                setAddError(null);
                setCreatedTemp(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>Add Teacher</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Teacher</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Full name"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="teacher@school.org"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Temporary Password</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder="Temp password"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Staff Code (optional)</Label>
                  <Input
                    value={form.staffCode}
                    onChange={(e) =>
                      setForm({ ...form, staffCode: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Phone (optional)</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </div>

                {addError && (
                  <div className="text-sm text-[hsl(var(--destructive))]">
                    {addError}
                  </div>
                )}

                {createdTemp && (
                  <div className="text-xs rounded-md border border-[hsl(var(--ring))] bg-[hsl(var(--ring))]/10 p-2">
                    Temp password: <b>{createdTemp}</b>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOpenAdd(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={addTeacher}
                    disabled={
                      !form.name.trim() ||
                      !form.email.trim() ||
                      !form.password.trim()
                    }
                  >
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* table */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Teachers{" "}
            {loading && (
              <span className="ml-2 text-sm text-[hsl(var(--muted-foreground))]">
                Loading…
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Classes & Subjects</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="align-top border-b last:border-none"
                  >
                    <td className="py-2 pr-3">{u.name}</td>
                    <td className="py-2 pr-3">{u.email}</td>
                    <td className="py-2 pr-3">
                      {(allocSummary[u.id] || []).length === 0 ? (
                        <span className="text-[hsl(var(--muted-foreground))] text-xs">
                          No allocations
                        </span>
                      ) : (
                        (allocSummary[u.id] || []).map((a, idx) => (
                          <div key={idx} className="mb-2">
                            <div className="text-sm font-medium">
                              {a.className}{" "}
                              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                ({a.subjects.length} subject
                                {a.subjects.length !== 1 && "s"})
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {a.subjects.map((s) => (
                                <span
                                  key={s}
                                  className="px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[10px] text-[hsl(var(--muted-foreground))]"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {u.isActive ? (
                        <span className="text-[hsl(var(--secondary))]">
                          Active
                        </span>
                      ) : (
                        <span className="text-[hsl(var(--muted-foreground))]">
                          Inactive
                        </span>
                      )}
                      {u.mustChangePassword && (
                        <span className="ml-2 text-xs text-[hsl(var(--accent))]">
                          first login
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAllocateFor(u.id)}
                        >
                          Allocate to Class
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAssignFor(u.id)}
                          disabled={subjects.length === 0}
                        >
                          Assign Subjects
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(u)}
                        >
                          {u.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-[hsl(var(--muted-foreground))]"
                    >
                      No teachers
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Allocate to Class */}
      <Dialog
        open={!!openAllocate}
        onOpenChange={(v) => !v && setOpenAllocate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate to Class</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 overflow-auto max-h-72">
            {classes.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allocated.includes(c.id)}
                  onChange={() => toggleAlloc(c.id)}
                />
                {c.name}
                {c.stream ? ` ${c.stream}` : ""}
                {c.year ? ` • ${c.year}` : ""}
              </label>
            ))}
            {classes.length === 0 && (
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                No classes available
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenAllocate(null)}>
              Cancel
            </Button>
            <Button onClick={saveAllocate}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Subjects × Classes */}
      <Dialog
        open={!!openAssign}
        onOpenChange={(v) => !v && setOpenAssign(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Subjects to Classes</DialogTitle>
          </DialogHeader>
          {subjects.length === 0 && (
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              No subjects yet. Add subjects first.
            </div>
          )}
          {subjects.length > 0 && (
            <div className="space-y-4 overflow-auto max-h-80">
              {classes.map((c) => (
                <div key={c.id} className="p-3 border rounded-lg">
                  <div className="mb-2 text-sm font-medium">
                    {c.name}
                    {c.stream ? ` ${c.stream}` : ""}
                    {c.year ? ` • ${c.year}` : ""}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {subjects.map((s) => (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked(c.id, s.id)}
                          onChange={() => togglePair(c.id, s.id)}
                        />
                        {s.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenAssign(null)}>
              Cancel
            </Button>
            <Button onClick={saveAssign}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
