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

type StudentDetail = StudentRow;

type Guardian = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  relation?: string | null;
};

type SubjectResult = {
  subjectId: string;
  subjectName?: string | null;
  subjectCode?: string | null;
  total: number;
  grade: string;
  points: number;
};

type ResultRow = {
  studentId: string;
  studentCode: string;
  name: string;
  subjects: SubjectResult[];
  bestSix: SubjectResult[];
  totalPoints: number;
  totalMarks: number;
  passed: boolean;
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
  const [fullStudent, setFullStudent] = useState<StudentDetail | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [studentSubjects, setStudentSubjects] = useState<SubjectResult[]>([]);

  // inline suspend / dismiss forms
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [suspendDays, setSuspendDays] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  const [showDismissForm, setShowDismissForm] = useState(false);
  const [dismissReason, setDismissReason] = useState("");

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

  const loadStudentDetails = async (id: string) => {
    setViewLoading(true);
    setActionMessage(null);
    setShowSuspendForm(false);
    setShowDismissForm(false);
    setStudentSubjects([]);

    try {
      const sRes = await api.get(`/api/students/${id}`);
      const raw = sRes.data.data;

      // Map backend shape (currentClass) into the "class" field we use in the modal
      const mapped: any = {
        ...(selected || {}), // keep table row info as fallback
        ...raw,
        class: raw.currentClass
          ? {
              id: raw.currentClass.id,
              name: raw.currentClass.name,
              stream: raw.currentClass.stream,
              year: raw.currentClass.year,
            }
          : selected?.class || null,
      };

      setFullStudent(mapped);

      const gRes = await api.get("/api/guardians", {
        params: { studentId: id },
      });
      setGuardians(gRes.data.data || []);

      // 3) Subjects via latest class results
      if (mapped.class?.id) {
        const rRes = await api.get(
          `/api/exams/results/class/${mapped.class.id}`
        );
        const rows: ResultRow[] = rRes.data.data || [];
        const row = rows.find((r) => r.studentId === id);
        setStudentSubjects(row?.subjects || []);
      } else {
        setStudentSubjects([]);
      }
    } catch (err) {
      console.error("loadStudentDetails error:", err);
    } finally {
      setViewLoading(false);
    }
  };

  const openViewStudent = (st: StudentRow) => {
    setSelected(st);
    setFullStudent(null);
    setGuardians([]);
    setStudentSubjects([]);
    setOpenView(true);
    void loadStudentDetails(st.id);
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
      setActionMessage("Failed to delete student.");
    }
  };

  const confirmSuspend = async () => {
    if (!selected) return;
    const daysNum = Number(suspendDays);
    if (!daysNum || daysNum <= 0) {
      setActionMessage("Please enter a valid number of days.");
      return;
    }
    try {
      await api.post(`/api/students/${selected.id}/suspend`, {
        days: daysNum,
        reason: suspendReason.trim(),
      });
      setShowSuspendForm(false);
      setSuspendDays("");
      setSuspendReason("");
      setActionMessage("Student suspended. Guardian will be notified.");
      await loadStudents(q, selectedClassId || undefined);
      await loadStudentDetails(selected.id);
    } catch (err) {
      console.error("confirmSuspend error:", err);
      setActionMessage("Failed to suspend student.");
    }
  };

  const confirmDismiss = async () => {
    if (!selected) return;
    if (!dismissReason.trim()) {
      setActionMessage("Please enter a dismissal reason.");
      return;
    }
    try {
      await api.post(`/api/students/${selected.id}/dismiss`, {
        reason: dismissReason.trim(),
      });
      setShowDismissForm(false);
      setDismissReason("");
      setActionMessage("Student dismissed. Guardian will be notified.");
      await loadStudents(q, selectedClassId || undefined);
      await loadStudentDetails(selected.id);
    } catch (err) {
      console.error("confirmDismiss error:", err);
      setActionMessage("Failed to dismiss student.");
    }
  };

  const s: StudentDetail | StudentRow | null = fullStudent || selected;
  const selectedAge = s ? calculateAge((s as any).dateOfBirth) : null;

  // 🔐 who is allowed to suspend/dismiss/delete THIS student?
  const canDisciplineThisStudent =
    !!s &&
    (isAdmin || (isTeacher && s.class && myFormClassIds.includes(s.class.id)));

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

      {/* View Student dialog with full details + subjects + inline actions */}
      <Dialog open={openView} onOpenChange={(v) => !v && setOpenView(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>

          {!s || viewLoading ? (
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              Loading details…
            </div>
          ) : (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-sm">
              {/* Top summary */}
              <div className="space-y-1">
                <div className="text-base font-semibold">
                  {s.firstName}
                  {s.middleName ? " " + s.middleName : ""} {s.lastName}
                </div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  Code: {s.studentCode}
                </div>
                <div>
                  <span className="font-medium">Class:</span>{" "}
                  {s.class
                    ? `${s.class.name}${
                        s.class.stream ? " " + s.class.stream : ""
                      }${s.class.year ? " • " + s.class.year : ""}`
                    : "-"}
                </div>
                <div>
                  <span className="font-medium">Status:</span>{" "}
                  <span className="capitalize">{s.status}</span>
                </div>
                {s.dateOfBirth && (
                  <div>
                    <span className="font-medium">Date of Birth:</span>{" "}
                    {new Date(s.dateOfBirth).toLocaleDateString()}
                    {selectedAge !== null && ` • ${selectedAge} years`}
                  </div>
                )}
                {s.phone && (
                  <div>
                    <span className="font-medium">Phone:</span> {s.phone}
                  </div>
                )}
                {s.nationalId && (
                  <div>
                    <span className="font-medium">National ID:</span>{" "}
                    {s.nationalId}
                  </div>
                )}
              </div>

              {/* Subjects */}
              <div className="pt-3 border-t">
                <div className="mb-1 text-sm font-semibold">
                  Subjects ({studentSubjects.length})
                </div>
                {studentSubjects.length === 0 ? (
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">
                    No subjects found yet for this student. Ensure assessments
                    and marks have been captured.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {studentSubjects.map((subj) => (
                      <span
                        key={subj.subjectId}
                        className="px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[10px] text-[hsl(var(--muted-foreground))]"
                      >
                        {subj.subjectName || subj.subjectCode || "Subject"}{" "}
                        {subj.subjectCode ? `(${subj.subjectCode})` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Guardians */}
              <div className="pt-3 border-t">
                <div className="mb-1 text-sm font-semibold">
                  Guardian Details
                </div>
                {guardians.length === 0 ? (
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">
                    No guardians found. Use the Guardians page to register one.
                  </div>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {guardians.map((g) => (
                      <li key={g.id}>
                        <span className="font-semibold">{g.name}</span>{" "}
                        {g.relation && <span>({g.relation})</span>} •{" "}
                        <span>{g.phone || g.email || "No contact"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Actions + inline forms (only if permitted) */}
              <div className="pt-3 space-y-2 border-t">
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  Actions (these will also notify the guardian from the
                  backend):
                </div>

                {actionMessage && (
                  <div className="px-2 py-1 text-xs border rounded text-emerald-700 bg-emerald-50 border-emerald-200">
                    {actionMessage}
                  </div>
                )}

                {canDisciplineThisStudent ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowSuspendForm((prev) => !prev);
                          setShowDismissForm(false);
                          setActionMessage(null);
                        }}
                      >
                        Suspend
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowDismissForm((prev) => !prev);
                          setShowSuspendForm(false);
                          setActionMessage(null);
                        }}
                      >
                        Dismiss
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={deleteStudent}
                      >
                        Delete
                      </Button>
                    </div>

                    {/* Suspend form */}
                    {showSuspendForm && (
                      <div className="mt-3 border rounded-lg p-3 space-y-2 bg-[hsl(var(--muted))]/30">
                        <div className="text-xs font-semibold">
                          Suspend Student
                        </div>
                        <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
                          <div className="grid gap-1.5">
                            <Label className="text-xs">
                              Days of suspension
                            </Label>
                            <Input
                              type="number"
                              min={1}
                              value={suspendDays}
                              onChange={(e) => setSuspendDays(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-1.5 sm:col-span-2">
                            <Label className="text-xs">Reason</Label>
                            <textarea
                              className="min-h-[80px] rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2 text-xs outline-none"
                              value={suspendReason}
                              onChange={(e) => setSuspendReason(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowSuspendForm(false);
                              setSuspendDays("");
                              setSuspendReason("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button size="sm" onClick={confirmSuspend}>
                            Confirm Suspend
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Dismiss form */}
                    {showDismissForm && (
                      <div className="mt-3 border rounded-lg p-3 space-y-2 bg-[hsl(var(--muted))]/30">
                        <div className="text-xs font-semibold">
                          Dismiss Student
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-xs">Reason</Label>
                          <textarea
                            className="min-h-[80px] rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2 text-xs outline-none"
                            value={dismissReason}
                            onChange={(e) => setDismissReason(e.target.value)}
                          />
                        </div>
                        <div className="flex justify-end gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowDismissForm(false);
                              setDismissReason("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button size="sm" onClick={confirmDismiss}>
                            Confirm Dismiss
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">
                    You can view this student’s details but you do not have
                    permission to suspend, dismiss or delete them.
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
