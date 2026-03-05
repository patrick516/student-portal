import { useCallback, useEffect, useState } from "react";
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
import {
  Search,
  UserPlus,
  Mail,
  Phone,
  Users,
  Send,
  // Edit,
  Trash2,
  Shield,
  UserCheck,
  // ChevronDown,
  Loader2,
  AlertCircle,
  BookOpen,
  Link,
  X, // Add this import
} from "lucide-react";
type Guardian = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  relation?: string | null;
};

type StudentOption = { id: string; label: string };

type StudentsResponse = {
  data: {
    id: string;
    student_code: string;
    first_name: string;
    last_name: string;
  }[];
};

type GuardiansResponse = {
  data: Guardian[];
};

type SendResultsResponse = {
  recipients?: string[];
};

export default function GuardiansPage() {
  const { selectedClassId } = useApp();
  const [studentQuery, setStudentQuery] = useState("");
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [student, setStudent] = useState<StudentOption | null>(null);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(false);

  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    relation: "",
  });

  const searchStudents = useCallback(
    async (term: string) => {
      if (!term.trim()) {
        setStudentOptions([]);
        return;
      }
      const { data } = await api.get<StudentsResponse>("/api/students", {
        params: { search: term, classId: selectedClassId || undefined },
      });
      const opts: StudentOption[] = (data.data || []).map((s) => ({
        id: s.id,
        label: `${s.student_code} • ${s.first_name} ${s.last_name}`,
      }));
      setStudentOptions(opts);
    },
    [selectedClassId],
  );

  useEffect(() => {
    void searchStudents(studentQuery);
  }, [studentQuery, selectedClassId, searchStudents]);

  const loadGuardians = useCallback(async () => {
    if (!student) {
      setGuardians([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get<GuardiansResponse>("/api/guardians", {
        params: { studentId: student.id },
      });
      setGuardians(data.data || []);
    } finally {
      setLoading(false);
    }
  }, [student]);

  useEffect(() => {
    if (student) {
      void loadGuardians();
    }
  }, [student, loadGuardians]);

  const addGuardian = async () => {
    if (!student) return;
    await api.post("/api/guardians", {
      studentId: student.id,
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      relation: form.relation.trim() || undefined,
    });
    setForm({ name: "", email: "", phone: "", relation: "" });
    setOpenAdd(false);
    void loadGuardians();
  };

  const updateGuardian = async (
    g: Guardian,
    field: keyof Guardian,
    value: string,
  ) => {
    await api.put(`/api/guardians/${g.id}`, {
      [field]: value || null,
    });
    void loadGuardians();
  };

  const removeGuardian = async (g: Guardian) => {
    if (!confirm("Remove this guardian?")) return;
    await api.delete(`/api/guardians/${g.id}`);
    void loadGuardians();
  };

  const sendResults = async () => {
    if (!student || !selectedClassId) {
      alert("Select a class and a student first.");
      return;
    }
    try {
      const { data } = await api.post<SendResultsResponse>(
        "/api/exams/send-results-email",
        {
          classId: selectedClassId,
          studentId: student.id,
        },
      );
      const recipients = data.recipients ?? [];
      alert(
        recipients.length
          ? `Results sent to: ${recipients.join(", ")}`
          : "Results sent (no recipients listed).",
      );
    } catch (error: unknown) {
      const maybeAxiosError = error as {
        response?: { data?: { error?: string } };
      };
      alert(
        maybeAxiosError.response?.data?.error || "Failed to send results email",
      );
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-blue-50/20 to-emerald-50/30">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-200/50">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-transparent bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text">
                Guardians & Contacts
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage student guardians and send exam results
              </p>
            </div>
          </div>
        </div>

        {/* Search and Actions Card */}
        <Card className="overflow-hidden border-none shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1 max-w-xl">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <Label className="text-sm font-semibold text-slate-700">
                    Select Student
                  </Label>
                </div>
                <div className="relative">
                  <Search className="absolute w-5 h-5 transform -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                  <Input
                    placeholder="Search student by name or code..."
                    value={student ? student.label : studentQuery}
                    onChange={(e) => {
                      setStudent(null);
                      setStudentQuery(e.target.value);
                      setShowStudentDropdown(true);
                    }}
                    onFocus={() => setShowStudentDropdown(true)}
                    className="h-12 pl-10 border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-emerald-400/20"
                  />
                  {student && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStudent(null);
                        setStudentQuery("");
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 h-7 w-7 hover:bg-slate-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}

                  {showStudentDropdown && student === null && studentQuery && (
                    <div className="absolute z-10 w-full mt-2 overflow-auto bg-white border shadow-lg rounded-xl max-h-60 border-slate-200">
                      {studentOptions.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                          <AlertCircle className="w-8 h-8 text-slate-300" />
                          <p className="text-sm font-medium text-slate-500">
                            No students found
                          </p>
                          <p className="text-xs text-slate-400">
                            Try a different search term
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-50/50">
                            Select a student
                          </div>
                          {studentOptions.map((opt) => (
                            <div
                              key={opt.id}
                              className="px-4 py-3 text-sm transition-colors border-b cursor-pointer hover:bg-emerald-50/50 border-slate-100 last:border-b-0"
                              onClick={() => {
                                setStudent(opt);
                                setStudentQuery(opt.label);
                                setShowStudentDropdown(false);
                              }}
                            >
                              <div className="font-medium text-slate-900">
                                {opt.label.split(" • ")[1]}
                              </div>
                              <div className="text-xs text-slate-500">
                                Student Code: {opt.label.split(" • ")[0]}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={sendResults}
                  disabled={!student || !selectedClassId}
                  className="flex items-center h-12 gap-2 px-5 font-semibold border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 rounded-xl disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Send Exam Results
                </Button>

                <Dialog open={openAdd} onOpenChange={setOpenAdd}>
                  <DialogTrigger asChild>
                    <Button
                      disabled={!student}
                      className="flex items-center h-12 gap-2 px-6 font-semibold text-white transition-all shadow-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-emerald-200/50 hover:shadow-xl disabled:opacity-50"
                    >
                      <UserPlus className="w-5 h-5" />
                      Add Guardian
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg border-none shadow-2xl rounded-2xl">
                    <DialogHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg shadow-md bg-gradient-to-br from-emerald-500 to-teal-600">
                          <UserPlus className="w-5 h-5 text-white" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-slate-800">
                          Add New Guardian
                        </DialogTitle>
                      </div>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label className="text-sm font-semibold text-slate-700">
                          Full Name
                        </Label>
                        <Input
                          value={form.name}
                          onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                          }
                          placeholder="Enter guardian's full name"
                          className="h-11 border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-emerald-400/20"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm font-semibold text-slate-700">
                          Email Address{" "}
                          <span className="font-normal text-slate-400">
                            (optional)
                          </span>
                        </Label>
                        <div className="relative">
                          <Mail className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                          <Input
                            type="email"
                            value={form.email}
                            onChange={(e) =>
                              setForm({ ...form, email: e.target.value })
                            }
                            placeholder="guardian@email.com"
                            className="pl-10 h-11 border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-emerald-400/20"
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm font-semibold text-slate-700">
                          Phone Number{" "}
                          <span className="font-normal text-slate-400">
                            (optional)
                          </span>
                        </Label>
                        <div className="relative">
                          <Phone className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                          <Input
                            value={form.phone}
                            onChange={(e) =>
                              setForm({ ...form, phone: e.target.value })
                            }
                            placeholder="+1 (555) 123-4567"
                            className="pl-10 h-11 border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-emerald-400/20"
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-sm font-semibold text-slate-700">
                          Relation to Student
                        </Label>
                        <div className="relative">
                          <Link className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                          <Input
                            value={form.relation}
                            onChange={(e) =>
                              setForm({ ...form, relation: e.target.value })
                            }
                            placeholder="e.g., Mother, Father, Guardian"
                            className="pl-10 h-11 border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-emerald-400/20"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setOpenAdd(false)}
                        className="font-semibold h-11 rounded-xl"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={addGuardian}
                        disabled={!form.name.trim()}
                        className="font-semibold text-white h-11 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl disabled:opacity-50"
                      >
                        Save Guardian
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guardians List Card */}
        <Card className="overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-emerald-50/30 border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-800">
                {student ? (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100">
                      <UserCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div>Guardians for {student.label.split(" • ")[1]}</div>
                      <div className="text-sm font-normal text-slate-500">
                        Student Code: {student.label.split(" • ")[0]}
                      </div>
                    </div>
                  </div>
                ) : (
                  "Select a student to view guardians"
                )}
              </CardTitle>
              {student && guardians.length > 0 && (
                <div className="text-sm font-semibold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full">
                  {guardians.length} guardian{guardians.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!student && (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="p-4 rounded-full bg-slate-100">
                  <Users className="w-12 h-12 text-slate-300" />
                </div>
                <div>
                  <p className="font-medium text-slate-600">
                    No student selected
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Use the search box above to select a student
                  </p>
                </div>
              </div>
            )}
            {student && (
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 mb-3 text-emerald-600 animate-spin" />
                    <p className="text-sm font-medium text-slate-600">
                      Loading guardians...
                    </p>
                  </div>
                ) : guardians.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 py-16 text-center">
                    <div className="p-4 rounded-full bg-emerald-50">
                      <Shield className="w-12 h-12 text-emerald-300" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-600">
                        No guardians added yet
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Add guardians to manage student contacts
                      </p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50/50 border-slate-100">
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                          Guardian
                        </th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                          Relation
                        </th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                          Contact Information
                        </th>
                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {guardians.map((g) => (
                        <tr
                          key={g.id}
                          className="transition-colors hover:bg-slate-50/30 group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100">
                                <span className="font-semibold text-emerald-700">
                                  {g.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <Input
                                defaultValue={g.name}
                                onBlur={(e) =>
                                  updateGuardian(g, "name", e.target.value)
                                }
                                className="h-10 font-medium border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-emerald-400/20"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Input
                              defaultValue={g.relation || ""}
                              onBlur={(e) =>
                                updateGuardian(g, "relation", e.target.value)
                              }
                              placeholder="Relation"
                              className="h-10 border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-emerald-400/20"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-slate-400" />
                                <Input
                                  defaultValue={g.email || ""}
                                  onBlur={(e) =>
                                    updateGuardian(g, "email", e.target.value)
                                  }
                                  placeholder="Email address"
                                  className="h-10 border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-emerald-400/20"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-slate-400" />
                                <Input
                                  defaultValue={g.phone || ""}
                                  onBlur={(e) =>
                                    updateGuardian(g, "phone", e.target.value)
                                  }
                                  placeholder="Phone number"
                                  className="h-10 border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-emerald-400/20"
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeGuardian(g)}
                              className="px-4 text-xs font-semibold transition-all rounded-lg h-9 border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
