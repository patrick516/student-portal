import { useEffect, useMemo, useState, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Search,
  PlusCircle,
  User,
  Mail,
  Key,
  Phone,
  BookOpen,
  GraduationCap,
  Loader2,
  CheckCircle,
  XCircle,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  staffCode?: string;
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

interface ApiResponse {
  data: any;
  error?: string;
}

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
  const [showPassword, setShowPassword] = useState(false);
  const [createdTemp, setCreatedTemp] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  // Allocate classes
  const [openAllocate, setOpenAllocate] = useState<string | null>(null);
  const [allocated, setAllocated] = useState<string[]>([]);

  // Assign subjects × classes
  const [openAssign, setOpenAssign] = useState<string | null>(null);
  const [assignMatrix, setAssignMatrix] = useState<AssignmentItem[]>([]);

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse>("/api/users", {
        params: { role: "teacher" },
      });
      const list: UserRow[] = data.data || [];
      setRows(list);
      await loadAllocSummary(list);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSubjects = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse>("/api/subjects");
      setSubjects(data.data || []);
    } catch {
      setSubjects([]);
    }
  }, []);

  const loadAllocSummary = async (teachers: UserRow[]) => {
    const result: Record<string, AllocSummaryItem[]> = {};

    await Promise.all(
      teachers.map(async (t) => {
        try {
          const { data } = await api.get<ApiResponse>(
            `/api/users/${t.id}/assignments`
          );
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
  }, [loadTeachers, loadSubjects]);

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
      const res = await api.post<ApiResponse>("/api/users", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: "teacher",
        staffCode: form.staffCode.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      const data = res.data;
      setCreatedTemp((data as any)?.tempPassword ?? form.password);
      setForm({ name: "", email: "", password: "", staffCode: "", phone: "" });
      setOpenAdd(false);
      await loadTeachers();
    } catch (err: unknown) {
      const status = (err as any)?.response?.status;
      const msg = (err as any)?.response?.data?.error;
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
    const { data } = await api.get<ApiResponse>(
      `/api/users/${teacherId}/classes`
    );
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
    const { data } = await api.get<ApiResponse>(
      `/api/users/${teacherId}/assignments`
    );
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Teacher Management
            </h1>
            <p className="text-sm text-slate-600">
              Manage teachers, class allocations, and subject assignments
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
                  Total Teachers
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {rows.length}
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
                  {rows.filter((r) => r.isActive).length}
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
                <p className="text-sm font-medium text-slate-600">
                  Total Classes
                </p>
                <p className="text-2xl font-bold text-indigo-700">
                  {classes.length}
                </p>
              </div>
              <div className="p-2 bg-indigo-100 rounded-lg">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Subjects
                </p>
                <p className="text-2xl font-bold text-amber-700">
                  {subjects.length}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-amber-100">
                <BookOpen className="w-5 h-5 text-amber-600" />
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
              placeholder="Search by name or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-sm border rounded-xl border-slate-300 sm:w-64"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <Dialog
            open={openAdd}
            onOpenChange={(open) => {
              setOpenAdd(open);
              if (open) {
                setAddError(null);
                setCreatedTemp(null);
                setShowPassword(false);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <PlusCircle className="w-4 h-4" />
                Add Teacher
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <DialogTitle className="text-lg font-semibold text-slate-800">
                    Add New Teacher
                  </DialogTitle>
                </div>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <User className="w-4 h-4 text-blue-600" />
                    Full Name *
                  </Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter full name"
                    className="rounded-lg border-slate-300"
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Mail className="w-4 h-4 text-blue-600" />
                    Email Address *
                  </Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="teacher@school.org"
                    className="rounded-lg border-slate-300"
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Key className="w-4 h-4 text-blue-600" />
                    Temporary Password *
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      placeholder="Enter temporary password"
                      className="pr-10 rounded-lg border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute -translate-y-1/2 right-3 top-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                  <div className="text-xs text-slate-500">
                    Teacher will be asked to change this on first login
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      Staff Code (optional)
                    </Label>
                    <Input
                      value={form.staffCode}
                      onChange={(e) =>
                        setForm({ ...form, staffCode: e.target.value })
                      }
                      placeholder="e.g., STF001"
                      className="rounded-lg border-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      Phone (optional)
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
                </div>

                {addError && (
                  <div className="p-3 text-sm border rounded-lg text-rose-700 bg-rose-50 border-rose-200">
                    {addError}
                  </div>
                )}

                {createdTemp && (
                  <div className="p-3 text-sm border rounded-lg text-emerald-700 bg-emerald-50 border-emerald-200">
                    <div className="font-medium">
                      Teacher created successfully!
                    </div>
                    <div className="mt-1">
                      Temporary password:{" "}
                      <span className="font-mono font-bold">{createdTemp}</span>
                    </div>
                    <div className="mt-1 text-xs text-emerald-600">
                      Share this password with the teacher. They must change it
                      on first login.
                    </div>
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
                    onClick={addTeacher}
                    disabled={
                      !form.name.trim() ||
                      !form.email.trim() ||
                      !form.password.trim()
                    }
                    className="h-10 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    Create Teacher
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Teachers Table Card */}
      <Card className="overflow-hidden shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg shadow bg-gradient-to-br from-blue-500 to-indigo-600">
                <Users className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-lg font-semibold text-slate-800">
                Teacher Directory
              </CardTitle>
            </div>
            <div className="text-sm text-slate-600">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading…
                </div>
              ) : (
                `${filtered.length} teacher${filtered.length !== 1 ? "s" : ""}`
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
                    Teacher
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Allocations
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
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="transition-colors duration-200 group hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 text-sm font-semibold text-white rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                          {u.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {u.name}
                          </div>
                          <div className="text-sm text-slate-600">
                            {u.email}
                          </div>
                          {u.staffCode && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              Staff Code: {u.staffCode}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(allocSummary[u.id] || []).length === 0 ? (
                        <div className="text-sm italic text-slate-500">
                          No allocations yet
                        </div>
                      ) : (
                        <div className="max-w-xs space-y-2">
                          {(allocSummary[u.id] || []).map((a, idx) => (
                            <div
                              key={idx}
                              className="p-2 transition-colors border rounded-lg border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"
                            >
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-sm font-medium text-slate-800">
                                  {a.className}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="ml-auto text-xs border-slate-300"
                                >
                                  {a.subjects.length} subject
                                  {a.subjects.length !== 1 && "s"}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {a.subjects.map((s) => (
                                  <Badge
                                    key={s}
                                    variant="outline"
                                    className="text-xs border-slate-300"
                                  >
                                    {s}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <Badge
                          className={`${
                            u.isActive
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-100 border-0"
                          }`}
                        >
                          {u.isActive ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                        {u.mustChangePassword && (
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-300 text-amber-700"
                          >
                            <Lock className="w-2.5 h-2.5 mr-1" />
                            First login required
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAllocateFor(u.id)}
                            className="flex items-center gap-1.5 rounded-lg border-slate-300 hover:bg-slate-50"
                          >
                            <GraduationCap className="w-3.5 h-3.5" />
                            Allocate
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAssignFor(u.id)}
                            disabled={subjects.length === 0}
                            className="flex items-center gap-1.5 rounded-lg border-slate-300 hover:bg-slate-50"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            Assign
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(u)}
                          className={`flex items-center gap-1.5 rounded-lg ${
                            u.isActive
                              ? "border-rose-300 text-rose-700 hover:bg-rose-50"
                              : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {u.isActive ? (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              Activate
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-full bg-slate-100">
                          <Users className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">
                            No teachers found
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {q
                              ? "Try adjusting your search"
                              : "Start by adding a teacher"}
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

      {/* Allocate to Class Dialog */}
      <Dialog
        open={!!openAllocate}
        onOpenChange={(v) => !v && setOpenAllocate(null)}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <DialogTitle className="text-lg font-semibold text-slate-800">
                Allocate to Classes
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="pr-2 space-y-3 overflow-auto max-h-72">
            {classes.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 p-3 transition-colors border rounded-lg border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"
              >
                <input
                  type="checkbox"
                  checked={allocated.includes(c.id)}
                  onChange={() => toggleAlloc(c.id)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">
                    {c.name}
                    {c.stream ? ` ${c.stream}` : ""}
                  </div>
                  {c.year && (
                    <div className="text-xs text-slate-500">Year {c.year}</div>
                  )}
                </div>
                {allocated.includes(c.id) && (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                )}
              </div>
            ))}
            {classes.length === 0 && (
              <div className="p-4 text-center text-slate-500">
                <GraduationCap className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No classes available</p>
                <p className="mt-1 text-xs">
                  Add classes first to allocate teachers
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpenAllocate(null)}
              className="h-10 px-6 rounded-xl border-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={saveAllocate}
              className="h-10 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Save Allocation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Subjects × Classes Dialog */}
      <Dialog
        open={!!openAssign}
        onOpenChange={(v) => !v && setOpenAssign(null)}
      >
        <DialogContent className="max-w-4xl rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <DialogTitle className="text-lg font-semibold text-slate-800">
                Assign Subjects to Classes
              </DialogTitle>
            </div>
          </DialogHeader>
          {subjects.length === 0 && (
            <div className="p-4 text-center text-slate-500">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No subjects available</p>
              <p className="mt-1 text-xs">
                Add subjects first to assign to teachers
              </p>
            </div>
          )}
          {subjects.length > 0 && (
            <div className="space-y-4 overflow-auto max-h-[60vh] pr-2">
              {classes.map((c) => (
                <div
                  key={c.id}
                  className="p-4 border rounded-xl border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <GraduationCap className="w-4 h-4 text-blue-600" />
                    <div className="text-sm font-semibold text-slate-800">
                      {c.name}
                      {c.stream ? ` ${c.stream}` : ""}
                      {c.year && ` • Year ${c.year}`}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {subjects.map((s) => (
                      <label
                        key={s.id}
                        className="flex items-center gap-3 p-2.5 border rounded-lg border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked(c.id, s.id)}
                          onChange={() => togglePair(c.id, s.id)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <div className="flex-1 text-sm font-medium text-slate-700">
                          {s.name}
                        </div>
                        {isChecked(c.id, s.id) && (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpenAssign(null)}
              className="h-10 px-6 rounded-xl border-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={saveAssign}
              disabled={subjects.length === 0}
              className="h-10 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Save Assignments
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
