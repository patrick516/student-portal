// frontend/src/app/guardians/GuardiansPage.tsx
import { useEffect, useState } from "react";
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

type Guardian = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  relation?: string | null;
};

type StudentOption = { id: string; label: string };

export default function GuardiansPage() {
  const { selectedClassId } = useApp();
  const [studentQuery, setStudentQuery] = useState("");
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [student, setStudent] = useState<StudentOption | null>(null);

  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(false);

  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    relation: "",
  });

  const searchStudents = async (term: string) => {
    if (!term.trim()) {
      setStudentOptions([]);
      return;
    }
    const { data } = await api.get("/api/students", {
      params: { search: term, classId: selectedClassId || undefined },
    });
    const opts: StudentOption[] = (data.data || []).map((s: any) => ({
      id: s.id,
      label: `${s.student_code} • ${s.first_name} ${s.last_name}`,
    }));
    setStudentOptions(opts);
  };

  useEffect(() => {
    searchStudents(studentQuery);
  }, [studentQuery, selectedClassId]);

  const loadGuardians = async () => {
    if (!student) {
      setGuardians([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get("/api/guardians", {
        params: { studentId: student.id },
      });
      setGuardians(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (student) loadGuardians();
  }, [student?.id]);

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
    loadGuardians();
  };

  const updateGuardian = async (
    g: Guardian,
    field: keyof Guardian,
    value: string
  ) => {
    await api.put(`/api/guardians/${g.id}`, {
      [field]: value || null,
    });
    loadGuardians();
  };

  const removeGuardian = async (g: Guardian) => {
    if (!confirm("Remove this guardian?")) return;
    await api.delete(`/api/guardians/${g.id}`);
    loadGuardians();
  };

  const sendResults = async () => {
    if (!student || !selectedClassId) {
      alert("Select a class and a student first.");
      return;
    }
    try {
      const { data } = await api.post("/api/exams/send-results-email", {
        classId: selectedClassId,
        studentId: student.id,
      });
      alert(`Results sent to: ${(data.recipients || []).join(", ")}`);
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to send results email");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Guardians & Contacts</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Input
              placeholder="Search student…"
              value={student ? student.label : studentQuery}
              onChange={(e) => {
                setStudent(null);
                setStudentQuery(e.target.value);
              }}
              className="w-72"
            />
            {student === null && studentQuery && (
              <div className="absolute z-10 w-full mt-1 overflow-auto bg-white border rounded-md max-h-48">
                {studentOptions.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No matches
                  </div>
                )}
                {studentOptions.map((opt) => (
                  <div
                    key={opt.id}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      setStudent(opt);
                      setStudentQuery(opt.label);
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="outline"
            onClick={sendResults}
            disabled={!student || !selectedClassId}
          >
            Send Exam Results Email
          </Button>

          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button disabled={!student}>Add Guardian</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Guardian</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Email (optional)</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
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
                <div className="grid gap-1.5">
                  <Label>Relation (e.g. Mother, Father)</Label>
                  <Input
                    value={form.relation}
                    onChange={(e) =>
                      setForm({ ...form, relation: e.target.value })
                    }
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpenAdd(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addGuardian} disabled={!form.name.trim()}>
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {student
              ? `Guardians for ${student.label}`
              : "Select a student to view guardians"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!student && (
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              Use the search box above to select a student.
            </div>
          )}
          {student && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b">
                  <tr>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Relation</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {guardians.map((g) => (
                    <tr key={g.id} className="border-b last:border-none">
                      <td className="py-2 pr-3">
                        <Input
                          defaultValue={g.name}
                          onBlur={(e) =>
                            updateGuardian(g, "name", e.target.value)
                          }
                          className="h-8"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          defaultValue={g.relation || ""}
                          onBlur={(e) =>
                            updateGuardian(g, "relation", e.target.value)
                          }
                          className="h-8"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          defaultValue={g.email || ""}
                          onBlur={(e) =>
                            updateGuardian(g, "email", e.target.value)
                          }
                          className="h-8"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          defaultValue={g.phone || ""}
                          onBlur={(e) =>
                            updateGuardian(g, "phone", e.target.value)
                          }
                          className="h-8"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeGuardian(g)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {guardians.length === 0 && !loading && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-[hsl(var(--muted-foreground))]"
                      >
                        No guardians added yet.
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-4 text-center text-[hsl(var(--muted-foreground))]"
                      >
                        Loading…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
