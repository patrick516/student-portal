import { useEffect, useMemo, useState, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Search,
  PlusCircle,
  BookMarked,
  Hash,
  Loader2,
  CheckCircle,
  FileText,
  GraduationCap,
} from "lucide-react";

type Subject = { id: string; name: string; code?: string | null };

interface ApiResponse {
  data: Subject[];
  error?: string;
}

export default function SubjectsPage() {
  const [rows, setRows] = useState<Subject[]>([]);
  const [q, setQ] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({ name: "", code: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ApiResponse>("/api/subjects");
      setRows(data?.data || []);
    } catch (error) {
      console.error("Failed to load subjects:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        q
          ? (r.name + (r.code || "")).toLowerCase().includes(q.toLowerCase())
          : true
      ),
    [rows, q]
  );

  const addSubject = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post("/api/subjects", {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
      });
      setForm({ name: "", code: "" });
      setOpenAdd(false);
      await load();
    } catch (error) {
      console.error("Failed to add subject:", error);
    } finally {
      setSaving(false);
    }
  };

  const totalSubjects = rows.length;
  const subjectsWithCodes = rows.filter((s) => s.code).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shadow-lg">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Subject Management
            </h1>
            <p className="text-sm text-slate-600">
              Manage all academic subjects and their codes
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
                  Total Subjects
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {totalSubjects}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">With Codes</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {subjectsWithCodes}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-100">
                <Hash className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Without Codes
                </p>
                <p className="text-2xl font-bold text-amber-700">
                  {totalSubjects - subjectsWithCodes}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-amber-100">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  For Class Use
                </p>
                <p className="text-2xl font-bold text-indigo-700">
                  {totalSubjects}
                </p>
              </div>
              <div className="p-2 bg-indigo-100 rounded-lg">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
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
              placeholder="Search subjects by name or code…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-sm border rounded-xl border-slate-300 sm:w-64"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <PlusCircle className="w-4 h-4" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <DialogTitle className="text-lg font-semibold text-slate-800">
                    Add New Subject
                  </DialogTitle>
                </div>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <BookMarked className="w-4 h-4 text-blue-600" />
                    Subject Name *
                  </Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Mathematics, English Language, Physics"
                    className="rounded-lg border-slate-300"
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Hash className="w-4 h-4 text-blue-600" />
                    Subject Code (optional)
                  </Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="e.g., MATH, ENG, PHY"
                    className="rounded-lg border-slate-300"
                  />
                  <div className="text-xs text-slate-500">
                    Used for quick identification (usually 3-4 characters)
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setOpenAdd(false)}
                    className="h-10 px-6 rounded-xl border-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={addSubject}
                    disabled={saving || !form.name.trim()}
                    className="h-10 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Add Subject"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Subjects Table Card */}
      <Card className="overflow-hidden shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg shadow bg-gradient-to-br from-blue-500 to-indigo-600">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-lg font-semibold text-slate-800">
                Subject Directory
              </CardTitle>
            </div>
            <div className="text-sm text-slate-600">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading…
                </div>
              ) : (
                `${filtered.length} subject${filtered.length !== 1 ? "s" : ""}`
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
                    Subject
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Code
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="transition-colors duration-200 group hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 text-sm font-semibold text-white rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                          {s.name[0]}
                        </div>
                        <div className="font-medium text-slate-900">
                          {s.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {s.code ? (
                        <code className="px-3 py-1.5 font-mono text-sm font-semibold text-blue-700 bg-blue-100 rounded-lg">
                          {s.code}
                        </code>
                      ) : (
                        <span className="text-sm text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={`border-slate-300 ${
                          s.code
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-50 text-slate-600"
                        }`}
                      >
                        {s.code ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Has Code
                          </>
                        ) : (
                          "No Code"
                        )}
                      </Badge>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={3} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-full bg-slate-100">
                          <BookOpen className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">
                            No subjects found
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {q
                              ? "Try adjusting your search"
                              : "Start by adding your first subject"}
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

      {/* Information Section */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="mb-1 text-sm font-semibold text-slate-800">
                About Subject Management
              </div>
              <div className="text-sm text-slate-600">
                Subjects form the foundation of the curriculum. Each subject can
                be assigned to teachers and allocated to specific classes.
                Subject codes (like "MATH" or "ENG") are optional but helpful
                for quick identification in reports and schedules.
              </div>
              <div className="grid grid-cols-1 gap-2 mt-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  Subjects are required for class scheduling
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  Assign subjects to teachers for teaching duties
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  Use subject codes for quick identification
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  Subjects appear in exam results and reports
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
