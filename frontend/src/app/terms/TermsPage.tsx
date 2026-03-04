// frontend/src/app/terms/TermsPage.tsx
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Check, X, Sparkles, Plus, XCircle } from "lucide-react";

type Term = {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

type TermListResponse = {
  data: Term[];
};

type TermForm = {
  name: string;
  year: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

const initialForm: TermForm = {
  name: "",
  year: "",
  startDate: "",
  endDate: "",
  isActive: false,
};

export default function TermsPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [form, setForm] = useState<TermForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get<TermListResponse>("/api/terms");
    setTerms(data.data || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createTerm = async () => {
    setLoading(true);
    try {
      await api.post("/api/terms", {
        name: form.name.trim(),
        year: Number(form.year),
        startDate: form.startDate,
        endDate: form.endDate,
        isActive: form.isActive,
      });
      setForm(initialForm);
      setIsModalOpen(false);
      void load();
    } finally {
      setLoading(false);
    }
  };

  const setActive = async (id: string) => {
    await api.post(`/api/terms/${id}/activate`);
    void load();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200/50">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-transparent bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text">
                Academic Terms
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage school terms and semesters
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 font-semibold text-white transition-all shadow-lg h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-indigo-200/50 hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Create New Term
          </Button>
        </div>

        {/* Terms List Card */}
        <Card className="overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-indigo-50/30 border-slate-100">
            <CardTitle className="text-lg font-bold text-slate-800">
              All Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50/50 border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                      Name
                    </th>
                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                      Year
                    </th>
                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                      Start Date
                    </th>
                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                      End Date
                    </th>
                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                      Status
                    </th>
                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {terms.map((t) => (
                    <tr
                      key={t.id}
                      className="transition-colors hover:bg-slate-50/50 group"
                    >
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">
                          {t.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600">{t.year}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600">
                          {formatDate(t.startDate)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600">
                          {formatDate(t.endDate)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {t.isActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                            <Check className="w-3.5 h-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                            <X className="w-3.5 h-3.5" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="outline"
                          disabled={t.isActive}
                          onClick={() => void setActive(t.id)}
                          className="px-4 text-xs font-semibold transition-all rounded-lg h-9 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-inherit"
                        >
                          {t.isActive ? "Current" : "Set Active"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {terms.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 rounded-full bg-slate-100">
                            <Calendar className="w-8 h-8 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-600">
                              No terms created yet
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                              Create your first term to get started
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
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 duration-200 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl duration-200 bg-white shadow-2xl rounded-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded-t-2xl border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg shadow-md bg-gradient-to-br from-indigo-500 to-purple-600">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  Create New Term
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 transition-colors rounded-lg hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Term Name
                  </Label>
                  <Input
                    placeholder="e.g., Term 1"
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="h-11 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20 rounded-xl"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Academic Year
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g., 2026"
                    value={form.year}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, year: e.target.value }))
                    }
                    className="h-11 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20 rounded-xl"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    className="h-11 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20 rounded-xl"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    End Date
                  </Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    className="h-11 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20 rounded-xl"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="inline-flex items-center gap-3 px-4 py-3 transition-all border border-indigo-100 cursor-pointer bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl hover:from-indigo-100 hover:to-purple-100">
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-indigo-600 border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          isActive: e.target.checked,
                        }))
                      }
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Set as current active term
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-6 py-4 border-t bg-slate-50/50 rounded-b-2xl border-slate-100">
              <Button
                onClick={() => setIsModalOpen(false)}
                variant="outline"
                className="flex-1 font-semibold transition-all h-11 border-slate-300 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={createTerm}
                disabled={
                  !form.name.trim() ||
                  !form.year ||
                  !form.startDate ||
                  !form.endDate ||
                  loading
                }
                className="flex-1 px-8 font-semibold text-white transition-all shadow-lg h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-indigo-200/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? "Saving..." : "Save Term"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
