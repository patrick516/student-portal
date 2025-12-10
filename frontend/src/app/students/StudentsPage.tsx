// frontend/src/app/students/StudentsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { useApp } from "@/app/state/useApp";
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

type StudentRow = {
  id: string;
  studentCode: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  status: string;
  dateOfBirth?: string | null;
  phone?: string | null;
  nationalId?: string | null;
  class?: Klass | null;
};

type StudentsResponse = { data: StudentRow[] };

type NewStudentForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  nationalId: string;
  dateOfBirth: string;
  classId: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianRelation: string;
};

const emptyForm: NewStudentForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  phone: "",
  nationalId: "",
  dateOfBirth: "",
  classId: "",
  guardianName: "",
  guardianPhone: "",
  guardianEmail: "",
  guardianRelation: "",
};

function calculateAge(dobIso?: string | null): number | null {
  if (!dobIso) return null;
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export default function StudentsPage() {
  const app: any = useApp();
  const classes: Klass[] = app.classes || [];
  const me: any = app.me || app.user || {};
  const selectedClassId: string | undefined = app.selectedClassId;

  const role: string | undefined = me?.role;
  const isAdmin = role === "admin";
  const isTeacher = role === "teacher";

  // all classes where I'm the form teacher
  const myFormClassIds: string[] = classes
    .filter((c) => c.formTeacher && c.formTeacher.id === me.id)
    .map((c) => c.id);

  const isFormTeacherGlobal = isTeacher && myFormClassIds.length > 0;
  const isFormTeacherForSelected =
    isFormTeacherGlobal &&
    !!selectedClassId &&
    myFormClassIds.includes(selectedClassId);

  // Only admin or form teacher *for the selected class* can add students
  const canAddStudent = isAdmin || isFormTeacherForSelected;

  // Classes that the current user is allowed to add students into
  const addableClasses: Klass[] = isAdmin
    ? classes
    : classes.filter((c) => myFormClassIds.includes(c.id));

  const [rows, setRows] = useState<StudentRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // add student dialog
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState<NewStudentForm>(emptyForm);
  const [addError, setAddError] = useState<string | null>(null);

  // view student dialog
  const [openView, setOpenView] = useState(false);
  const [selected, setSelected] = useState<StudentRow | null>(null);

  // ========= advanced loader (search + class filter) =========
  const loadStudents = async (searchTerm: string, classFilter?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      const trimmed = searchTerm.trim();
      if (trimmed) params.search = trimmed;
      if (classFilter) params.classId = classFilter;

      const { data } = await api.get<StudentsResponse>("/api/students", {
        params,
      });

      // backend already enforces permissions for teacher / bursar
      const list: StudentRow[] = data.data || [];
      setRows(list);
    } catch (err) {
      console.error("loadStudents error:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStudents(q, selectedClassId || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId]);

  useEffect(() => {
    const id = setTimeout(() => {
      void loadStudents(q, selectedClassId || undefined);
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const filtered = useMemo(() => rows, [rows]);

  const handleOpenAdd = (open: boolean) => {
    setOpenAdd(open);
    if (open) {
      // preselect current class if it's one of the allowed ones
      const preferredClassId =
        selectedClassId && addableClasses.some((c) => c.id === selectedClassId)
          ? selectedClassId
          : "";
      setForm({ ...emptyForm, classId: preferredClassId || "" });
      setAddError(null);
    }
  };

  const createStudent = async () => {
    setAddError(null);

    try {
      await api.post("/api/students", {
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim() || null,
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || null,
        nationalId: form.nationalId.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        currentClassId: form.classId || null,
        guardian: {
          name: form.guardianName.trim() || null,
          phone: form.guardianPhone.trim() || null,
          email: form.guardianEmail.trim() || null,
          relation: form.guardianRelation.trim() || null,
        },
      });

      setForm(emptyForm);
      setOpenAdd(false);
      await loadStudents(q, selectedClassId || undefined);
    } catch (err: any) {
      console.error("createStudent error:", err);
      const msg = err?.response?.data?.error;
      setAddError(msg || "Failed to add student. Please try again.");
    }
  };

  const openViewStudent = (st: StudentRow) => {
    setSelected(st);
    setOpenView(true);
  };

  const deleteStudent = async () => {
    if (!selected) return;
    if (!window.confirm("Delete this student? This cannot be undone.")) return;
    try {
      await api.delete(`/api/students/${selected.id}`);
      setOpenView(false);
      setSelected(null);
      await loadStudents(q, selectedClassId || undefined);
    } catch (err) {
      console.error("deleteStudent error:", err);
      alert("Failed to delete student.");
    }
  };

  const suspendStudent = async () => {
    if (!selected) return;
    const daysStr = window.prompt(
      "Enter number of days for suspension (e.g. 3):"
    );
    if (!daysStr) return;
    const days = Number(daysStr);
    if (!days || days <= 0) {
      alert("Please enter a valid number of days.");
      return;
    }
    const reason = window.prompt("Enter reason for suspension:") || "";
    try {
      await api.post(`/api/students/${selected.id}/suspend`, {
        days,
        reason,
      });
      await loadStudents(q, selectedClassId || undefined);
      alert("Student suspended and guardian will be notified (backend).");
    } catch (err) {
      console.error("suspendStudent error:", err);
      alert("Failed to suspend student.");
    }
  };

  const dismissStudent = async () => {
    if (!selected) return;
    const reason = window.prompt("Enter reason for dismissal:") || "";
    if (!reason) return;
    try {
      await api.post(`/api/students/${selected.id}/dismiss`, {
        reason,
      });
      await loadStudents(q, selectedClassId || undefined);
      alert("Student dismissed and guardian will be notified (backend).");
    } catch (err) {
      console.error("dismissStudent error:", err);
      alert("Failed to dismiss student.");
    }
  };

  const selectedAge = selected ? calculateAge(selected.dateOfBirth) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Students</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by name or code…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-72"
          />
          {canAddStudent && (
            <Dialog open={openAdd} onOpenChange={handleOpenAdd}>
              <DialogTrigger asChild>
                <Button>Add Student</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Register New Student</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 max-h-[75vh] overflow-y-auto pr-1">
                  {/* Student basic info */}
                  <div className="grid gap-2">
                    <h2 className="text-sm font-semibold tracking-wide">
                      Student Details
                    </h2>

                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">
                      Student code will be generated automatically (e.g.
                      SA0001).
                    </p>

                    <div className="grid gap-1.5 sm:grid-cols-3 sm:gap-3">
                      <div className="grid gap-1.5">
                        <Label>First Name</Label>
                        <Input
                          value={form.firstName}
                          onChange={(e) =>
                            setForm({ ...form, firstName: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Middle Name (optional)</Label>
                        <Input
                          value={form.middleName}
                          onChange={(e) =>
                            setForm({ ...form, middleName: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Surname</Label>
                        <Input
                          value={form.lastName}
                          onChange={(e) =>
                            setForm({ ...form, lastName: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-1.5 sm:grid-cols-3 sm:gap-3">
                      <div className="grid gap-1.5">
                        <Label>Phone (optional)</Label>
                        <Input
                          value={form.phone}
                          onChange={(e) =>
                            setForm({ ...form, phone: e.target.value })
                          }
                          placeholder="+2659…"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>National ID (optional)</Label>
                        <Input
                          value={form.nationalId}
                          onChange={(e) =>
                            setForm({ ...form, nationalId: e.target.value })
                          }
                          placeholder="National ID number"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Date of Birth</Label>
                        <Input
                          type="date"
                          value={form.dateOfBirth}
                          onChange={(e) =>
                            setForm({ ...form, dateOfBirth: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-1.5">
                      <Label>Class</Label>
                      <select
                        className="h-10 rounded-md bg-[hsl(var(--input))] px-3 text-sm outline-none border border-[hsl(var(--border))]"
                        value={form.classId}
                        onChange={(e) =>
                          setForm({ ...form, classId: e.target.value })
                        }
                      >
                        <option value="">Select class…</option>
                        {addableClasses.map((c: Klass) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.stream ? ` ${c.stream}` : ""}
                            {c.year ? ` • ${c.year}` : ""}
                          </option>
                        ))}
                      </select>
                      {addableClasses.length === 0 && (
                        <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                          No classes available for you to add students. Only
                          form teachers and Head Teacher can register students.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Guardian info */}
                  <div className="grid gap-2 pt-3 border-t">
                    <h2 className="text-sm font-semibold tracking-wide">
                      Guardian Details
                    </h2>
                    <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
                      <div className="grid gap-1.5">
                        <Label>Full Name</Label>
                        <Input
                          value={form.guardianName}
                          onChange={(e) =>
                            setForm({ ...form, guardianName: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Relation (e.g. Father, Aunt)</Label>
                        <Input
                          value={form.guardianRelation}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              guardianRelation: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
                      <div className="grid gap-1.5">
                        <Label>Phone</Label>
                        <Input
                          value={form.guardianPhone}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              guardianPhone: e.target.value,
                            })
                          }
                          placeholder="+2659…"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Email (optional)</Label>
                        <Input
                          value={form.guardianEmail}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              guardianEmail: e.target.value,
                            })
                          }
                          placeholder="guardian@example.com"
                        />
                      </div>
                    </div>
                  </div>

                  {addError && (
                    <div className="text-sm text-[hsl(var(--destructive))]">
                      {addError}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpenAdd(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={createStudent}
                      disabled={
                        !form.firstName.trim() ||
                        !form.lastName.trim() ||
                        !form.classId
                      }
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Students table */}
      <Card className="border-none shadow-sm bg-white/95 rounded-2xl">
        <CardHeader>
          <CardTitle>
            All Students{" "}
            {loading && (
              <span className="ml-2 text-xs text-[hsl(var(--muted-foreground))]">
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
                  <th className="py-2 pr-3">Student Code</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Class</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((st) => {
                  const fullName = `${st.firstName}${
                    st.middleName ? " " + st.middleName : ""
                  } ${st.lastName}`;
                  const klass = st.class
                    ? st.class.name +
                      (st.class.stream ? " " + st.class.stream : "") +
                      (st.class.year ? " • " + st.class.year : "")
                    : "-";
                  return (
                    <tr
                      key={st.id}
                      className="border-b last:border-none hover:bg-[hsl(var(--muted))]/40 transition-colors"
                    >
                      <td className="py-2 pr-3">{st.studentCode}</td>
                      <td className="py-2 pr-3">{fullName}</td>
                      <td className="py-2 pr-3">{klass}</td>
                      <td className="py-2 pr-3 capitalize">{st.status}</td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openViewStudent(st)}
                          >
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={5}
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

      {/* View Student dialog with actions */}
      <Dialog open={openView} onOpenChange={(v) => !v && setOpenView(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 text-sm">
              <div className="grid gap-1">
                <div className="font-semibold">
                  {selected.firstName}
                  {selected.middleName ? " " + selected.middleName : ""}{" "}
                  {selected.lastName}
                </div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  Code: {selected.studentCode}
                </div>
              </div>

              <div className="grid gap-1">
                <div>
                  <span className="font-medium">Class: </span>
                  {selected.class
                    ? `${selected.class.name}${
                        selected.class.stream ? " " + selected.class.stream : ""
                      }${
                        selected.class.year ? " • " + selected.class.year : ""
                      }`
                    : "-"}
                </div>
                <div>
                  <span className="font-medium">Status: </span>
                  <span className="capitalize">{selected.status}</span>
                </div>
                {selected.dateOfBirth && (
                  <div>
                    <span className="font-medium">Date of Birth: </span>
                    {new Date(selected.dateOfBirth).toLocaleDateString()}
                    {selectedAge !== null && ` • ${selectedAge} years`}
                  </div>
                )}
                {selected.phone && (
                  <div>
                    <span className="font-medium">Phone: </span>
                    {selected.phone}
                  </div>
                )}
                {selected.nationalId && (
                  <div>
                    <span className="font-medium">National ID: </span>
                    {selected.nationalId}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t">
                <div className="text-xs text-[hsl(var(--muted-foreground))] mb-2">
                  Actions (these will also notify the guardian from the
                  backend):
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={suspendStudent}>
                    Suspend
                  </Button>
                  <Button variant="outline" size="sm" onClick={dismissStudent}>
                    Dismiss
                  </Button>
                  <Button variant="outline" size="sm" onClick={deleteStudent}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
