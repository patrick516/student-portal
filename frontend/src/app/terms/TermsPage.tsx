// frontend/src/app/terms/TermsPage.tsx
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Check,
  X,
  Sparkles,
  Plus,
  XCircle,
  Zap,
  AlertTriangle,
  Users,
  DollarSign,
  CreditCard,
  Loader2,
  Clock,
  CheckCircle,
} from "lucide-react";

type Term = {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  status: string;
};

type TermForm = {
  name: string;
  year: string;
  startDate: string;
  endDate: string;
};

type ActivationPreview = {
  termName: string;
  studentsWithFees: number;
  studentsWithCredit: number;
  totalInvoiceAmount: number;
  totalCreditToApply: number;
};

type ActivationResult = {
  ok: boolean;
  message: string;
  invoicesCreated: number;
  creditsApplied: number;
  totalCreditAmount: number;
};

const initialForm: TermForm = {
  name: "",
  year: new Date().getFullYear().toString(),
  startDate: "",
  endDate: "",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-600/20",
  ended: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  upcoming: "bg-blue-100 text-blue-700 ring-1 ring-blue-600/20",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  active: <Check className="w-3.5 h-3.5" />,
  ended: <X className="w-3.5 h-3.5" />,
  upcoming: <Clock className="w-3.5 h-3.5" />,
};

export default function TermsPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [form, setForm] = useState<TermForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Activation preview
  const [previewTerm, setPreviewTerm] = useState<Term | null>(null);
  const [preview, setPreview] = useState<ActivationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activationResult, setActivationResult] =
    useState<ActivationResult | null>(null);

  const load = useCallback(async () => {
    const { data } = await api.get("/api/terms");
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
      });
      setForm(initialForm);
      setIsModalOpen(false);
      void load();
    } finally {
      setLoading(false);
    }
  };

  const openActivationPreview = async (term: Term) => {
    setPreviewTerm(term);
    setPreview(null);
    setActivationResult(null);
    setPreviewLoading(true);
    try {
      const { data } = await api.get(
        `/api/terms/${term.id}/preview-activation`,
      );
      setPreview(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmActivate = async () => {
    if (!previewTerm) return;
    setActivating(true);
    try {
      const { data } = await api.post(`/api/terms/${previewTerm.id}/activate`);
      setActivationResult(data);
      void load();
    } catch (e) {
      console.error(e);
    } finally {
      setActivating(false);
    }
  };

  const closePreview = () => {
    setPreviewTerm(null);
    setPreview(null);
    setActivationResult(null);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Academic Terms
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage school terms — activating a term auto-generates invoices
                and applies credits
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 font-semibold text-white h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create New Term
          </Button>
        </div>

        {/* Terms Table */}
        <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
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
                    {[
                      "Name",
                      "Year",
                      "Start Date",
                      "End Date",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {terms.map((t) => {
                    const statusKey =
                      t.status || (t.isActive ? "active" : "upcoming");
                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {t.name}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{t.year}</td>
                        <td className="px-6 py-4 text-slate-600">
                          {formatDate(t.startDate)}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {formatDate(t.endDate)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                              STATUS_STYLES[statusKey] ||
                              STATUS_STYLES["upcoming"]
                            }`}
                          >
                            {STATUS_ICONS[statusKey] ||
                              STATUS_ICONS["upcoming"]}
                            {statusKey.charAt(0).toUpperCase() +
                              statusKey.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {!t.isActive ? (
                            <Button
                              variant="outline"
                              onClick={() => openActivationPreview(t)}
                              className="flex items-center gap-2 px-4 text-xs font-semibold h-9 rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              Set Active
                            </Button>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Current
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {terms.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 rounded-full bg-slate-100">
                            <Calendar className="w-8 h-8 text-slate-400" />
                          </div>
                          <p className="font-medium text-slate-600">
                            No terms yet
                          </p>
                          <p className="text-sm text-slate-400">
                            Create your first term to get started
                          </p>
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

      {/* Create Term Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white shadow-2xl rounded-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded-t-2xl border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  Create New Term
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <XCircle className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-sm font-semibold text-slate-700">
                  Term Name
                </Label>
                <Input
                  placeholder="e.g., Term 1"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="h-11 rounded-xl border-slate-200"
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
                    setForm((p) => ({ ...p, year: e.target.value }))
                  }
                  className="h-11 rounded-xl border-slate-200"
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
                    setForm((p) => ({ ...p, startDate: e.target.value }))
                  }
                  className="h-11 rounded-xl border-slate-200"
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
                    setForm((p) => ({ ...p, endDate: e.target.value }))
                  }
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t bg-slate-50/50 rounded-b-2xl border-slate-100">
              <Button
                onClick={() => setIsModalOpen(false)}
                variant="outline"
                className="flex-1 h-11 rounded-xl border-slate-300"
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
                className="flex-1 h-11 font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Term"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Activation Preview Modal */}
      {previewTerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white shadow-2xl rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b bg-gradient-to-r from-amber-50 to-orange-50/30 rounded-t-2xl border-amber-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Activate Term
                  </h2>
                  <p className="text-sm text-slate-500">
                    {previewTerm.name} {previewTerm.year}
                  </p>
                </div>
              </div>
              <button
                onClick={closePreview}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Success Result */}
              {activationResult ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-emerald-800">
                        Term Activated Successfully!
                      </p>
                      <p className="text-sm text-emerald-600 mt-0.5">
                        {activationResult.message}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 border border-slate-100 rounded-xl text-center">
                      <p className="text-2xl font-bold text-indigo-700">
                        {activationResult.invoicesCreated}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Invoices Created
                      </p>
                    </div>
                    <div className="p-4 border border-slate-100 rounded-xl text-center">
                      <p className="text-2xl font-bold text-emerald-700">
                        {activationResult.creditsApplied}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Credits Applied
                      </p>
                    </div>
                    <div className="p-4 border border-slate-100 rounded-xl text-center">
                      <p className="text-lg font-bold text-emerald-700">
                        MWK{" "}
                        {activationResult.totalCreditAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Total Credit
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={closePreview}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold"
                  >
                    Done
                  </Button>
                </div>
              ) : previewLoading ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="text-sm text-slate-500">
                    Calculating preview...
                  </p>
                </div>
              ) : preview ? (
                <div className="space-y-4">
                  {/* Warning */}
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-800">
                        Review before activating
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        The previous active term will be marked as <b>Ended</b>.
                        This cannot be undone.
                      </p>
                    </div>
                  </div>

                  {/* Preview Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 border border-slate-100 rounded-xl bg-slate-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <p className="text-xs font-semibold text-slate-600 uppercase">
                          Students with Fees
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-blue-700">
                        {preview.studentsWithFees}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        invoices will be created
                      </p>
                    </div>

                    <div className="p-4 border border-emerald-100 rounded-xl bg-emerald-50">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <p className="text-xs font-semibold text-slate-600 uppercase">
                          Students with Credit
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-emerald-700">
                        {preview.studentsWithCredit}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        credits will auto-apply
                      </p>
                    </div>

                    <div className="p-4 border border-slate-100 rounded-xl bg-slate-50">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-indigo-600" />
                        <p className="text-xs font-semibold text-slate-600 uppercase">
                          Total Invoices
                        </p>
                      </div>
                      <p className="text-lg font-bold text-indigo-700">
                        MWK {preview.totalInvoiceAmount.toLocaleString()}
                      </p>
                    </div>

                    <div className="p-4 border border-emerald-100 rounded-xl bg-emerald-50">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        <p className="text-xs font-semibold text-slate-600 uppercase">
                          Credits to Apply
                        </p>
                      </div>
                      <p className="text-lg font-bold text-emerald-700">
                        MWK {preview.totalCreditToApply.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={closePreview}
                      className="flex-1 h-11 rounded-xl border-slate-300"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmActivate}
                      disabled={activating}
                      className="flex-1 h-11 font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl"
                    >
                      {activating ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Activating...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Confirm Activate
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
