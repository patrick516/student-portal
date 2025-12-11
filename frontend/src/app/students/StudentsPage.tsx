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
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Search,
  PlusCircle,
  User,
  Calendar,
  Phone,
  BookOpen,
  Shield,
  ShieldAlert,
  Trash2,
  Eye,
  Mail,
  Hash,
  Clock,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  Loader2,
  XCircle,
  Filter,
  MoreVertical,
  Ban,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

type StudentDetail = StudentRow & {
  suspensionUntil?: string | null;
  suspensionReason?: string | null;
};

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

const StatusBadge = ({ status }: { status: string }) => {
  switch (status.toLowerCase()) {
    case "active":
      return (
        <Badge className="border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    case "suspended":
      return (
        <Badge className="border-0 bg-amber-100 text-amber-700 hover:bg-amber-100">
          <Clock className="w-3 h-3 mr-1" />
          Suspended
        </Badge>
      );
    case "dismissed":
      return (
        <Badge className="border-0 bg-rose-100 text-rose-700 hover:bg-rose-100">
          <XCircle className="w-3 h-3 mr-1" />
          Dismissed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="border-slate-300">
          {status}
        </Badge>
      );
  }
};

// Define AppState interface to avoid 'any'
interface AppState {
  classes?: Klass[];
  selectedClassId?: string;
  me?: {
    id: string;
    role: string;
    [key: string]: any;
  };
  user?: {
    id: string;
    role: string;
    [key: string]: any;
  };
}

export default function StudentsPage() {
  const app = useApp() as AppState;
  const classes: Klass[] = app.classes || [];
  const me = app.me || app.user || {};
  const selectedClassId: string | undefined = app.selectedClassId;

  const role: string | undefined = me?.role;
  const isAdmin = role === "admin";
  const isTeacher = role === "teacher";

  const myFormClassIds: string[] = classes
    .filter((c) => c.formTeacher && c.formTeacher.id === me.id)
    .map((c) => c.id);

  const isFormTeacherGlobal = isTeacher && myFormClassIds.length > 0;
  const isFormTeacherForSelected =
    isFormTeacherGlobal &&
    !!selectedClassId &&
    myFormClassIds.includes(selectedClassId);

  const canAddStudent = isAdmin || isFormTeacherForSelected;

  const addableClasses: Klass[] = isAdmin
    ? classes
    : classes.filter((c) => myFormClassIds.includes(c.id));

  const [rows, setRows] = useState<StudentRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState<NewStudentForm>(emptyForm);
  const [addError, setAddError] = useState<string | null>(null);

  const [openView, setOpenView] = useState(false);
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [fullStudent, setFullStudent] = useState<StudentDetail | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [studentSubjects, setStudentSubjects] = useState<SubjectResult[]>([]);

  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [suspendDays, setSuspendDays] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  const [showDismissForm, setShowDismissForm] = useState(false);
  const [dismissReason, setDismissReason] = useState("");

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
  }, [selectedClassId, q]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter(
      (row) => row.status.toLowerCase() === statusFilter.toLowerCase()
    );
  }, [rows, statusFilter]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === "active").length;
    const suspended = rows.filter((r) => r.status === "suspended").length;
    const dismissed = rows.filter((r) => r.status === "dismissed").length;
    return { active, suspended, dismissed, total: rows.length };
  }, [rows]);

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

      const mapped: StudentDetail = {
        ...(selected || ({} as StudentRow)),
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

  const confirmUnsuspend = async () => {
    if (!selected) return;
    try {
      await api.post(`/api/students/${selected.id}/unsuspend`);
      setActionMessage("Student unsuspended and set to active.");
      setShowSuspendForm(false);
      setShowDismissForm(false);
      await loadStudents(q, selectedClassId || undefined);
      await loadStudentDetails(selected.id);
    } catch (err) {
      console.error("confirmUnsuspend error:", err);
      setActionMessage("Failed to unsuspend student.");
    }
  };

  const s: StudentDetail | StudentRow | null = fullStudent || selected;
  const isSuspended = s?.status === "suspended";
  const selectedAge = s ? calculateAge(s.dateOfBirth) : null;
  const suspensionUntil = (s as StudentDetail | null)?.suspensionUntil || null;

  const canDisciplineThisStudent =
    !!s &&
    (isAdmin || (isTeacher && s.class && myFormClassIds.includes(s.class.id)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Student Management
            </h1>
            <p className="text-sm text-slate-600">
              Manage all students, their details and academic records
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Students
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.total}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {stats.active}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-100">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Suspended</p>
                <p className="text-2xl font-bold text-amber-700">
                  {stats.suspended}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-amber-100">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Dismissed</p>
                <p className="text-2xl font-bold text-rose-700">
                  {stats.dismissed}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-rose-100">
                <XCircle className="w-5 h-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
            <Input
              placeholder="Search by name or student code…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-sm border rounded-xl border-slate-300 sm:w-64"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
            <select
              className="h-10 pl-10 pr-4 text-sm transition-all duration-200 bg-white border shadow-sm cursor-pointer rounded-xl border-slate-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          {canAddStudent && (
            <Dialog open={openAdd} onOpenChange={handleOpenAdd}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <PlusCircle className="w-4 h-4" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl rounded-2xl">
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <DialogTitle className="text-lg font-semibold text-slate-800">
                      Register New Student
                    </DialogTitle>
                  </div>
                </DialogHeader>
                <div className="grid gap-6 max-h-[75vh] overflow-y-auto pr-2 py-2">
                  {/* Student basic info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <h2 className="text-sm font-semibold tracking-wide text-slate-700">
                        Student Details
                      </h2>
                    </div>

                    <div className="p-3 mb-2 text-xs rounded-lg text-slate-500 bg-blue-50">
                      Student code will be generated automatically (e.g.
                      SA0001).
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          First Name *
                        </Label>
                        <Input
                          value={form.firstName}
                          onChange={(e) =>
                            setForm({ ...form, firstName: e.target.value })
                          }
                          className="rounded-lg border-slate-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Middle Name
                        </Label>
                        <Input
                          value={form.middleName}
                          onChange={(e) =>
                            setForm({ ...form, middleName: e.target.value })
                          }
                          className="rounded-lg border-slate-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Surname *
                        </Label>
                        <Input
                          value={form.lastName}
                          onChange={(e) =>
                            setForm({ ...form, lastName: e.target.value })
                          }
                          className="rounded-lg border-slate-300"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Phone
                        </Label>
                        <div className="relative">
                          <Phone className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                          <Input
                            value={form.phone}
                            onChange={(e) =>
                              setForm({ ...form, phone: e.target.value })
                            }
                            placeholder="+2659…"
                            className="pl-10 rounded-lg border-slate-300"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          National ID
                        </Label>
                        <div className="relative">
                          <Hash className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                          <Input
                            value={form.nationalId}
                            onChange={(e) =>
                              setForm({ ...form, nationalId: e.target.value })
                            }
                            placeholder="National ID number"
                            className="pl-10 rounded-lg border-slate-300"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Date of Birth *
                        </Label>
                        <div className="relative">
                          <Calendar className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                          <Input
                            type="date"
                            value={form.dateOfBirth}
                            onChange={(e) =>
                              setForm({ ...form, dateOfBirth: e.target.value })
                            }
                            className="pl-10 rounded-lg border-slate-300"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <GraduationCap className="w-4 h-4 text-blue-600" />
                        Class *
                      </Label>
                      <select
                        className="w-full h-10 px-3 text-sm transition-all duration-200 bg-white border rounded-lg border-slate-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
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
                        <div className="p-2 mt-2 text-xs rounded-lg text-slate-500 bg-amber-50">
                          <AlertCircle className="inline-block w-3 h-3 mr-1" />
                          No classes available for you to add students. Only
                          form teachers and Head Teacher can register students.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Guardian info */}
                  <div className="pt-4 space-y-4 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <h2 className="text-sm font-semibold tracking-wide text-slate-700">
                        Guardian Details
                      </h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Full Name *
                        </Label>
                        <Input
                          value={form.guardianName}
                          onChange={(e) =>
                            setForm({ ...form, guardianName: e.target.value })
                          }
                          className="rounded-lg border-slate-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Relation (e.g. Father, Aunt) *
                        </Label>
                        <Input
                          value={form.guardianRelation}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              guardianRelation: e.target.value,
                            })
                          }
                          className="rounded-lg border-slate-300"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Phone *
                        </Label>
                        <div className="relative">
                          <Phone className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                          <Input
                            value={form.guardianPhone}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                guardianPhone: e.target.value,
                              })
                            }
                            placeholder="+2659…"
                            className="pl-10 rounded-lg border-slate-300"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Email
                        </Label>
                        <div className="relative">
                          <Mail className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                          <Input
                            value={form.guardianEmail}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                guardianEmail: e.target.value,
                              })
                            }
                            placeholder="guardian@example.com"
                            className="pl-10 rounded-lg border-slate-300"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {addError && (
                    <div className="p-3 text-sm border rounded-lg text-rose-700 bg-rose-50 border-rose-200">
                      {addError}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setOpenAdd(false)}
                      className="h-10 px-6 rounded-xl border-slate-300"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={createStudent}
                      disabled={
                        !form.firstName.trim() ||
                        !form.lastName.trim() ||
                        !form.classId
                      }
                      className="h-10 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      Register Student
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Students Table Card */}
      <Card className="overflow-hidden shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg shadow bg-gradient-to-br from-blue-500 to-indigo-600">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-lg font-semibold text-slate-800">
                Student Directory
              </CardTitle>
            </div>
            <div className="text-sm text-slate-600">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading…
                </div>
              ) : (
                `${filtered.length} student${filtered.length !== 1 ? "s" : ""}`
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Student
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Details
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((st) => {
                  const fullName = `${st.firstName}${
                    st.middleName ? " " + st.middleName : ""
                  } ${st.lastName}`;
                  const klass = st.class
                    ? `${st.class.name}${
                        st.class.stream ? " " + st.class.stream : ""
                      }${st.class.year ? ` • ${st.class.year}` : ""}`
                    : "-";
                  const age = calculateAge(st.dateOfBirth);

                  return (
                    <tr
                      key={st.id}
                      className="transition-colors duration-200 group hover:bg-slate-50/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 text-sm font-semibold text-white rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                            {st.firstName[0]}
                            {st.lastName[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {fullName}
                            </div>
                            <div className="font-mono text-sm text-slate-500">
                              {st.studentCode}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm text-slate-700">
                            <GraduationCap className="inline-block w-3.5 h-3.5 mr-1.5 text-slate-400" />
                            {klass}
                          </div>
                          {age && (
                            <div className="text-sm text-slate-500">
                              <Calendar className="inline-block w-3.5 h-3.5 mr-1.5 text-slate-400" />
                              {age} years old
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={st.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openViewStudent(st)}
                            className="flex items-center gap-1.5 rounded-lg border-slate-300 hover:bg-slate-50"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Details
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-0 h-9 w-9"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openViewStudent(st)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {canDisciplineThisStudent && (
                                <>
                                  {!isSuspended && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelected(st);
                                        setOpenView(true);
                                        setShowSuspendForm(true);
                                      }}
                                    >
                                      <Clock className="w-4 h-4 mr-2" />
                                      Suspend Student
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelected(st);
                                      setOpenView(true);
                                      setShowDismissForm(true);
                                    }}
                                  >
                                    <Ban className="w-4 h-4 mr-2" />
                                    Dismiss Student
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-full bg-slate-100">
                          <Users className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">
                            No students found
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {q || statusFilter !== "all"
                              ? "Try adjusting your search or filters"
                              : "Start by registering a student"}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* View Student Dialog */}
      <Dialog open={openView} onOpenChange={(v) => !v && setOpenView(false)}>
        <DialogContent className="max-w-4xl rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                <User className="w-5 h-5 text-white" />
              </div>
              <DialogTitle className="text-lg font-semibold text-slate-800">
                Student Details
              </DialogTitle>
            </div>
          </DialogHeader>

          {!s || viewLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-sm text-slate-600">Loading details…</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* Student Header */}
              <div className="flex items-start justify-between p-4 border rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/30 border-slate-200">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-16 h-16 text-xl font-bold text-white bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl">
                    {s.firstName[0]}
                    {s.lastName[0]}
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900">
                      {s.firstName}
                      {s.middleName ? " " + s.middleName : ""} {s.lastName}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-full">
                        <Hash className="w-3.5 h-3.5" />
                        {s.studentCode}
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                      <CardTitle className="text-sm font-semibold">
                        Class Information
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Class:</span>
                        <span className="font-medium">
                          {s.class
                            ? `${s.class.name}${
                                s.class.stream ? " " + s.class.stream : ""
                              }`
                            : "-"}
                        </span>
                      </div>
                      {s.class?.year && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Year:</span>
                          <span className="font-medium">{s.class.year}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <CardTitle className="text-sm font-semibold">
                        Personal Details
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {s.dateOfBirth && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Date of Birth:</span>
                          <span className="font-medium">
                            {new Date(s.dateOfBirth).toLocaleDateString()}
                            {selectedAge !== null && ` (${selectedAge} years)`}
                          </span>
                        </div>
                      )}
                      {s.phone && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Phone:</span>
                          <span className="font-medium">{s.phone}</span>
                        </div>
                      )}
                      {s.nationalId && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">National ID:</span>
                          <span className="font-medium">{s.nationalId}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Suspension Info */}
              {suspensionUntil && s.status === "suspended" && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <div className="font-medium text-amber-800">
                        Suspended
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-amber-700">
                      Student is suspended until{" "}
                      {new Date(suspensionUntil).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Subjects */}
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <CardTitle className="text-sm font-semibold">
                        Subjects
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="border-slate-300">
                      {studentSubjects.length} subjects
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {studentSubjects.length === 0 ? (
                    <div className="py-4 text-center text-slate-500">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">
                        No subjects found yet for this student.
                      </p>
                      <p className="mt-1 text-xs">
                        Ensure assessments and marks have been captured.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {studentSubjects.map((subj) => (
                        <div
                          key={subj.subjectId}
                          className="p-3 transition-colors border rounded-lg border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                        >
                          <div className="text-sm font-medium text-slate-900">
                            {subj.subjectName || subj.subjectCode || "Subject"}
                          </div>
                          {subj.subjectCode && (
                            <div className="mt-1 text-xs text-slate-500">
                              {subj.subjectCode}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs font-medium text-blue-700">
                              Grade: {subj.grade}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {subj.total} pts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Guardians */}
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-sm font-semibold">
                      Guardian Details
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {guardians.length === 0 ? (
                    <div className="py-4 text-center text-slate-500">
                      <Shield className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">No guardians found.</p>
                      <p className="mt-1 text-xs">
                        Use the Guardians page to register one.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {guardians.map((g) => (
                        <div
                          key={g.id}
                          className="p-3 border rounded-lg border-slate-200"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-slate-900">
                                {g.name}
                              </div>
                              {g.relation && (
                                <div className="text-sm text-slate-600">
                                  {g.relation}
                                </div>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className="border-slate-300"
                            >
                              Guardian
                            </Badge>
                          </div>
                          {(g.phone || g.email) && (
                            <div className="mt-2 space-y-1">
                              {g.phone && (
                                <div className="flex items-center text-sm text-slate-600">
                                  <Phone className="w-3 h-3 mr-2" />
                                  {g.phone}
                                </div>
                              )}
                              {g.email && (
                                <div className="flex items-center text-sm text-slate-600">
                                  <Mail className="w-3 h-3 mr-2" />
                                  {g.email}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              {canDisciplineThisStudent && (
                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <CardTitle className="text-sm font-semibold">
                        Student Management
                      </CardTitle>
                    </div>
                    <div className="text-xs text-slate-500">
                      These actions will notify the guardian
                    </div>
                  </CardHeader>
                  <CardContent>
                    {actionMessage && (
                      <div className="p-3 mb-4 text-sm border rounded-lg text-emerald-700 bg-emerald-50 border-emerald-200">
                        {actionMessage}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {!isSuspended ? (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowSuspendForm((prev) => !prev);
                              setShowDismissForm(false);
                              setActionMessage(null);
                            }}
                            className="border-amber-300 text-amber-700 hover:bg-amber-50"
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Suspend Student
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={confirmUnsuspend}
                            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Unsuspend Student
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowDismissForm((prev) => !prev);
                            setShowSuspendForm(false);
                            setActionMessage(null);
                          }}
                          className="border-rose-300 text-rose-700 hover:bg-rose-50"
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Dismiss Student
                        </Button>

                        <Button
                          variant="outline"
                          onClick={deleteStudent}
                          className="border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Student
                        </Button>
                      </div>

                      {/* Suspend Form */}
                      {showSuspendForm && (
                        <div className="p-4 border rounded-lg border-amber-200 bg-amber-50/50">
                          <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <div className="text-sm font-semibold text-amber-800">
                              Suspend Student
                            </div>
                          </div>
                          <div className="grid gap-3">
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-slate-700">
                                Days of suspension
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                value={suspendDays}
                                onChange={(e) => setSuspendDays(e.target.value)}
                                className="border-slate-300"
                                placeholder="e.g., 7"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-slate-700">
                                Reason
                              </Label>
                              <textarea
                                className="w-full min-h-[80px] p-3 text-sm border rounded-lg border-slate-300 bg-white outline-none resize-none"
                                value={suspendReason}
                                onChange={(e) =>
                                  setSuspendReason(e.target.value)
                                }
                                placeholder="Enter reason for suspension..."
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowSuspendForm(false);
                                setSuspendDays("");
                                setSuspendReason("");
                              }}
                              className="border-slate-300"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={confirmSuspend}
                              className="bg-amber-600 hover:bg-amber-700"
                            >
                              Confirm Suspend
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Dismiss Form */}
                      {showDismissForm && (
                        <div className="p-4 border rounded-lg border-rose-200 bg-rose-50/50">
                          <div className="flex items-center gap-2 mb-3">
                            <Ban className="w-4 h-4 text-rose-600" />
                            <div className="text-sm font-semibold text-rose-800">
                              Dismiss Student
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-slate-700">
                                Reason for dismissal
                              </Label>
                              <textarea
                                className="w-full min-h-[100px] p-3 text-sm border rounded-lg border-slate-300 bg-white outline-none resize-none"
                                value={dismissReason}
                                onChange={(e) =>
                                  setDismissReason(e.target.value)
                                }
                                placeholder="Enter detailed reason for dismissal..."
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowDismissForm(false);
                                setDismissReason("");
                              }}
                              className="border-slate-300"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={confirmDismiss}
                              className="bg-rose-600 hover:bg-rose-700"
                            >
                              Confirm Dismiss
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {!canDisciplineThisStudent && (
                <div className="p-4 text-sm border rounded-lg text-slate-600 bg-slate-50 border-slate-200">
                  You can view this student's details but you do not have
                  permission to suspend, dismiss, or delete them.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
