// frontend/src/app/fees/FeeSettingsPage.tsx
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/client";
import { useApp } from "@/app/state/useApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DollarSign,
  Save,
  Plus,
  Trash2,
  Calendar,
  School,
  Loader2,
  CheckCircle,
  AlertCircle,
  Settings,
  Globe,
  BookOpen,
  Calculator,
  Edit2,
  XCircle,
} from "lucide-react";

type Term = { id: string; name: string; year: number; isActive: boolean };

type FeeComponent = {
  id: string;
  termId: string;
  name: string;
  amount: number;
  optional: boolean;
  scope: "school" | "class";
  classId: string | null;
  className?: string | null;
  classStream?: string | null;
};

type ComponentForm = {
  name: string;
  amount: string;
  optional: boolean;
  scope: "school" | "class";
  classId: string;
};

const emptyForm: ComponentForm = {
  name: "",
  amount: "",
  optional: false,
  scope: "school",
  classId: "",
};

export default function FeeSettingsPage() {
  const { classes } = useApp();
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState("");
  const [components, setComponents] = useState<FeeComponent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ComponentForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Preview total for a selected class
  const [previewClassId, setPreviewClassId] = useState("");
  const [previewTotal, setPreviewTotal] = useState<number | null>(null);

  const loadTerms = useCallback(async () => {
    const { data } = await api.get("/api/terms");
    const list: Term[] = data.data || [];
    setTerms(list);
    const active = list.find((t) => t.isActive);
    if (active && !selectedTermId) setSelectedTermId(active.id);
  }, [selectedTermId]);

  const loadComponents = useCallback(async () => {
    if (!selectedTermId) return;
    setLoading(true);
    try {
      const { data } = await api.get("/api/fee-components", {
        params: { termId: selectedTermId },
      });
      setComponents(data.data || []);
    } finally {
      setLoading(false);
    }
  }, [selectedTermId]);

  useEffect(() => {
    void loadTerms();
  }, [loadTerms]);

  useEffect(() => {
    void loadComponents();
  }, [loadComponents]);

  // Calculate preview total when class or components change
  useEffect(() => {
    if (!previewClassId || !selectedTermId) {
      setPreviewTotal(null);
      return;
    }
    const applicable = components.filter(
      (c) => c.scope === "school" || c.classId === previewClassId,
    );
    const total = applicable.reduce((sum, c) => sum + Number(c.amount), 0);
    setPreviewTotal(total);
  }, [previewClassId, components, selectedTermId]);

  const handleSave = async () => {
    if (!selectedTermId || !form.name.trim() || !form.amount) return;
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return;

    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/fee-components/${editingId}`, {
          name: form.name.trim(),
          amount: amt,
          optional: form.optional,
          scope: form.scope,
          classId: form.scope === "class" ? form.classId : null,
        });
      } else {
        await api.post("/api/fee-components", {
          termId: selectedTermId,
          name: form.name.trim(),
          amount: amt,
          optional: form.optional,
          scope: form.scope,
          classId: form.scope === "class" ? form.classId : null,
        });
      }
      setForm(emptyForm);
      setShowForm(false);
      setEditingId(null);
      void loadComponents();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (c: FeeComponent) => {
    setForm({
      name: c.name,
      amount: String(c.amount),
      optional: c.optional,
      scope: c.scope,
      classId: c.classId || "",
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    try {
      await api.delete(`/api/fee-components/${id}`);
      void loadComponents();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteId(null);
    }
  };

  const schoolWide = components.filter((c) => c.scope === "school");
  const classSpecific = components.filter((c) => c.scope === "class");

  const termLabel = (id: string) => {
    const t = terms.find((x) => x.id === id);
    return t ? `${t.name} ${t.year}` : "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 shadow-lg">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Fee Settings</h1>
            <p className="text-sm text-slate-600">
              Configure fee components per term — school-wide or per class
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm(true);
          }}
          disabled={!selectedTermId}
          className="flex items-center gap-2 px-5 font-semibold text-white h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add Fee Component
        </Button>
      </div>

      {/* Term Selector */}
      <Card className="border-none shadow-lg rounded-2xl overflow-hidden">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <Calendar className="w-4 h-4" />
              Select Term:
            </div>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="h-10 pl-3 pr-8 text-sm bg-white border rounded-xl border-slate-200 focus:border-emerald-400 focus:outline-none"
            >
              <option value="">-- Select Term --</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.year} • {t.name}
                  {t.isActive ? " (Active)" : ""}
                </option>
              ))}
            </select>

            {selectedTermId && (
              <span className="text-sm text-slate-500">
                {components.length} component
                {components.length !== 1 ? "s" : ""} configured
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Form */}
      {showForm && (
        <Card className="border-2 border-emerald-200 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-base font-semibold text-slate-800">
                  {editingId ? "Edit Fee Component" : "New Fee Component"}
                </CardTitle>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyForm);
                  setEditingId(null);
                }}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {/* Name */}
              <div className="lg:col-span-1">
                <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  Component Name
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Tuition Fee"
                  className="h-11 rounded-xl border-slate-200 focus:border-emerald-400"
                />
              </div>

              {/* Amount */}
              <div>
                <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Amount (MWK)
                </Label>
                <div className="relative">
                  <div className="absolute font-medium -translate-y-1/2 left-3 top-1/2 text-slate-500 text-sm">
                    MWK
                  </div>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, amount: e.target.value }))
                    }
                    placeholder="0"
                    className="h-11 pl-14 rounded-xl border-slate-200 focus:border-emerald-400"
                  />
                </div>
                {form.amount && Number(form.amount) > 0 && (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    {Number(form.amount).toLocaleString()} Kwacha
                  </p>
                )}
              </div>

              {/* Scope */}
              <div>
                <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
                  <Globe className="w-4 h-4 text-blue-600" />
                  Applies To
                </Label>
                <select
                  value={form.scope}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      scope: e.target.value as "school" | "class",
                      classId: "",
                    }))
                  }
                  className="w-full h-11 pl-3 pr-4 text-sm bg-white border rounded-xl border-slate-200 focus:border-blue-400 focus:outline-none"
                >
                  <option value="school">🏫 All Classes (School-wide)</option>
                  <option value="class">📚 Specific Class Only</option>
                </select>
              </div>

              {/* Class (if scope = class) */}
              {form.scope === "class" && (
                <div>
                  <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
                    <School className="w-4 h-4 text-indigo-600" />
                    Select Class
                  </Label>
                  <select
                    value={form.classId}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, classId: e.target.value }))
                    }
                    className="w-full h-11 pl-3 pr-4 text-sm bg-white border rounded-xl border-slate-200 focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="">-- Select Class --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.stream ? ` ${c.stream}` : ""}
                        {c.year ? ` • ${c.year}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Optional toggle */}
            <div className="mt-4">
              <label className="inline-flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={form.optional}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, optional: e.target.checked }))
                  }
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700">
                    Optional fee
                  </span>
                  <p className="text-xs text-slate-500">
                    Optional fees can be excluded per student
                  </p>
                </div>
              </label>
            </div>

            {/* Save button */}
            <div className="flex justify-end gap-3 mt-5">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyForm);
                  setEditingId(null);
                }}
                className="px-6 h-11 rounded-xl border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  saving ||
                  !form.name.trim() ||
                  !form.amount ||
                  (form.scope === "class" && !form.classId)
                }
                className="px-8 h-11 font-semibold text-white rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:opacity-50"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {editingId ? "Update Component" : "Add Component"}
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedTermId && (
        <>
          {/* Fee Preview Calculator */}
          <Card className="border-none shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                  <Calculator className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="text-base font-semibold text-slate-800">
                  Fee Preview Calculator
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <School className="w-4 h-4" />
                  Calculate total for:
                </div>
                <select
                  value={previewClassId}
                  onChange={(e) => setPreviewClassId(e.target.value)}
                  className="h-10 pl-3 pr-8 text-sm bg-white border rounded-xl border-slate-200 focus:border-blue-400 focus:outline-none"
                >
                  <option value="">-- Select Class --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.stream ? ` ${c.stream}` : ""}
                    </option>
                  ))}
                </select>

                {previewTotal !== null && previewClassId && (
                  <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-slate-700">
                      Total fee for selected class:
                    </span>
                    <span className="text-lg font-bold text-emerald-700">
                      MWK {previewTotal.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {previewClassId && previewTotal !== null && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Breakdown:
                  </p>
                  {components
                    .filter(
                      (c) =>
                        c.scope === "school" || c.classId === previewClassId,
                    )
                    .map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium">
                            {c.scope === "school" ? "School-wide" : "Class"}
                          </span>
                          <span className="text-sm font-medium text-slate-700">
                            {c.name}
                          </span>
                          {c.optional && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              Optional
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-slate-800">
                          MWK {Number(c.amount).toLocaleString()}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* School-wide Components */}
          <Card className="border-none shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                    <Globe className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-800">
                      School-wide Fees
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Applies to all students regardless of class —{" "}
                      {termLabel(selectedTermId)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-500">
                  Total: MWK{" "}
                  {schoolWide
                    .reduce((s, c) => s + Number(c.amount), 0)
                    .toLocaleString()}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                </div>
              ) : schoolWide.length === 0 ? (
                <div className="py-12 text-center">
                  <Globe className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500 font-medium">
                    No school-wide fees yet
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Add a fee component with scope "All Classes"
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50/50 border-slate-100">
                      {["Fee Name", "Amount", "Type", "Actions"].map((h) => (
                        <th
                          key={h}
                          className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-left"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {schoolWide.map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {c.name}
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-700">
                          MWK {Number(c.amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          {c.optional ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                              <AlertCircle className="w-3 h-3" />
                              Optional
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                              <CheckCircle className="w-3 h-3" />
                              Required
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(c)}
                              className="flex items-center gap-1.5 rounded-lg border-slate-200 hover:bg-slate-50"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(c.id)}
                              disabled={deleteId === c.id}
                              className="flex items-center gap-1.5 rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                            >
                              {deleteId === c.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Class-specific Components */}
          <Card className="border-none shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                  <School className="w-4 h-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800">
                    Class-specific Fees
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Applies to specific classes only —{" "}
                    {termLabel(selectedTermId)}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {classSpecific.length === 0 ? (
                <div className="py-12 text-center">
                  <School className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500 font-medium">
                    No class-specific fees yet
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Add a fee component with scope "Specific Class"
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50/50 border-slate-100">
                      {["Fee Name", "Class", "Amount", "Type", "Actions"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-6 py-4 text-xs font-bold uppercase text-slate-600 text-left"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classSpecific.map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {c.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                            <School className="w-3 h-3" />
                            {c.className || "Unknown"}
                            {c.classStream ? ` ${c.classStream}` : ""}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-indigo-700">
                          MWK {Number(c.amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          {c.optional ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                              <AlertCircle className="w-3 h-3" />
                              Optional
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                              <CheckCircle className="w-3 h-3" />
                              Required
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(c)}
                              className="flex items-center gap-1.5 rounded-lg border-slate-200 hover:bg-slate-50"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(c.id)}
                              disabled={deleteId === c.id}
                              className="flex items-center gap-1.5 rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                            >
                              {deleteId === c.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
