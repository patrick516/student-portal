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
  Search,
  Filter,
  Calendar,
  School,
  Loader2,
  CheckCircle,
  AlertCircle,
  Settings,
  Eye,
} from "lucide-react";

type Term = { id: string; name: string; year: number; isActive: boolean };
type FeeSetting = {
  id: string;
  schoolId: string;
  termId: string;
  classId: string;
  amount: number;
};

type TermsResponse = { data: Term[] };
type FeeSettingsResponse = { data: FeeSetting[] };

export default function FeeSettingsPage() {
  const { classes } = useApp();
  const [terms, setTerms] = useState<Term[]>([]);
  const [feeSettings, setFeeSettings] = useState<FeeSetting[]>([]);

  const [selectedTermId, setSelectedTermId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const loadTerms = useCallback(async () => {
    const { data } = await api.get<TermsResponse>("/api/terms");
    const list = data.data || [];
    setTerms(list);
    const active = list.find((t) => t.isActive);
    if (active && !selectedTermId) {
      setSelectedTermId(active.id);
    }
  }, [selectedTermId]);

  const loadFeeSettings = useCallback(async () => {
    const { data } = await api.get<FeeSettingsResponse>("/api/fee-settings");
    setFeeSettings(data.data || []);
  }, []);

  useEffect(() => {
    void loadTerms();
    void loadFeeSettings();
  }, [loadTerms, loadFeeSettings]);

  useEffect(() => {
    if (!selectedTermId || !selectedClassId) {
      setAmount("");
      return;
    }
    // when term or class changes, look for existing fee setting
    const fs = feeSettings.find(
      (f) => f.termId === selectedTermId && f.classId === selectedClassId
    );
    setAmount(fs ? String(fs.amount) : "");
  }, [selectedTermId, selectedClassId, feeSettings]);

  const onSave = async () => {
    if (!selectedTermId || !selectedClassId) {
      alert("Select both term and class");
      return;
    }
    const num = Number(amount);
    if (!num || num <= 0) {
      alert("Amount must be greater than 0");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/fee-settings", {
        termId: selectedTermId,
        classId: selectedClassId,
        amount: num,
      });
      await loadFeeSettings();
    } catch (error: unknown) {
      const maybeAxiosError = error as {
        response?: { data?: { error?: string } };
      };

      console.error(error);
      alert(
        maybeAxiosError.response?.data?.error || "Failed to save fee setting"
      );
    } finally {
      setSaving(false);
    }
  };

  const findTerm = (id: string) => terms.find((t) => t.id === id);
  const findClass = (id: string) => classes.find((c) => c.id === id);

  // Filter fee settings based on search and filter
  const filteredFeeSettings = feeSettings.filter((fs) => {
    const term = findTerm(fs.termId);
    const klass = findClass(fs.classId);

    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      term?.name?.toLowerCase().includes(searchLower) ||
      term?.year?.toString().includes(searchLower) ||
      klass?.name?.toLowerCase().includes(searchLower) ||
      klass?.stream?.toLowerCase().includes(searchLower) ||
      fs.amount.toString().includes(searchLower);

    // Active filter
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "active" && term?.isActive) ||
      (activeFilter === "inactive" && !term?.isActive);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 shadow-lg">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Fee Settings</h1>
            <p className="text-sm text-slate-600">
              Configure required fees per term and class
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Card */}
      <Card className="overflow-hidden transition-all duration-300 shadow-lg border-slate-200 hover:shadow-xl">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg shadow bg-gradient-to-br from-emerald-500 to-green-600">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-lg font-semibold text-slate-800">
                Set Required Fee
              </CardTitle>
            </div>
            <div className="text-sm text-slate-500">
              {terms.filter((t) => t.isActive).length > 0 &&
                `${terms.filter((t) => t.isActive).length} active term(s)`}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Term Selection */}
            <div className="group">
              <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Academic Term
              </Label>
              <div className="relative">
                <select
                  className="w-full h-12 pl-10 pr-4 text-sm transition-all duration-200 bg-white border shadow-sm cursor-pointer rounded-xl border-slate-300 hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
                  value={selectedTermId}
                  onChange={(e) => setSelectedTermId(e.target.value)}
                >
                  <option value="" className="text-slate-400">
                    Select a term
                  </option>
                  {terms.map((t) => (
                    <option
                      key={t.id}
                      value={t.id}
                      className="flex items-center gap-2"
                    >
                      {t.year} • {t.name}
                      {t.isActive ? " (Active)" : ""}
                    </option>
                  ))}
                </select>
                <Calendar className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
              </div>
            </div>

            {/* Class Selection */}
            <div className="group">
              <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
                <School className="w-4 h-4 text-blue-600" />
                Class
              </Label>
              <div className="relative">
                <select
                  className="w-full h-12 pl-10 pr-4 text-sm transition-all duration-200 bg-white border shadow-sm cursor-pointer rounded-xl border-slate-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  <option value="" className="text-slate-400">
                    Select a class
                  </option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.stream ? ` ${c.stream}` : ""}
                      {c.year ? ` • ${c.year}` : ""}
                    </option>
                  ))}
                </select>
                <School className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
              </div>
            </div>

            {/* Amount Input */}
            <div className="group">
              <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Required Fee Amount
              </Label>
              <div className="relative">
                <div className="absolute font-medium -translate-y-1/2 left-3 top-1/2 text-slate-600">
                  MWK
                </div>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g., 400,000"
                  className="h-12 pr-4 text-sm transition-all duration-200 border shadow-sm rounded-xl border-slate-300 pl-14 hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              {amount && Number(amount) > 0 && (
                <div className="mt-2 text-xs font-medium text-emerald-600">
                  {Number(amount).toLocaleString()} Malawian Kwacha
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTermId("");
                setSelectedClassId("");
                setAmount("");
              }}
              className="px-6 font-semibold h-11 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Clear
            </Button>
            <Button
              onClick={onSave}
              disabled={
                saving || !selectedTermId || !selectedClassId || !amount
              }
              className="px-8 font-semibold text-white shadow-lg h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 shadow-emerald-200/50 hover:from-emerald-700 hover:to-green-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Fee Setting
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configured Fees Card */}
      <Card className="overflow-hidden shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg shadow bg-gradient-to-br from-blue-500 to-indigo-600">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-lg font-semibold text-slate-800">
                Configured Fees
              </CardTitle>
            </div>
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search fees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48 h-10 pl-10 pr-4 text-sm bg-white border shadow-sm rounded-xl border-slate-300"
                />
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="h-10 px-3 text-sm bg-white border shadow-sm rounded-xl border-slate-300"
                >
                  <option value="all">All Terms</option>
                  <option value="active">Active Terms</option>
                  <option value="inactive">Inactive Terms</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      Term
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    <div className="flex items-center gap-2">
                      <School className="w-3.5 h-3.5" />
                      Class
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5" />
                      Required Fee
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFeeSettings.map((f) => {
                  const term = findTerm(f.termId);
                  const klass = findClass(f.classId);
                  const isActiveTerm = term?.isActive;

                  return (
                    <tr
                      key={f.id}
                      className="transition-colors duration-200 group hover:bg-slate-50/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">
                            {term ? `${term.year} • ${term.name}` : f.termId}
                          </span>
                          {term?.isActive && (
                            <span className="inline-flex items-center gap-1 mt-1 text-xs">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                              <span className="font-medium text-emerald-600">
                                Active Term
                              </span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">
                            {klass ? klass.name : f.classId}
                          </span>
                          {klass && (
                            <span className="text-sm text-slate-500">
                              {klass.stream ? klass.stream : ""}
                              {klass.year ? ` • ${klass.year}` : ""}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-lg font-bold text-emerald-700">
                            MWK {Number(f.amount).toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500">
                            Malawian Kwacha
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isActiveTerm ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Inactive Term
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredFeeSettings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-full bg-slate-100">
                          <DollarSign className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">
                            {searchTerm || activeFilter !== "all"
                              ? "No matching fee settings found"
                              : "No fee settings configured yet"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {searchTerm || activeFilter !== "all"
                              ? "Try adjusting your search or filter"
                              : "Configure your first fee setting above"}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Footer */}
          {filteredFeeSettings.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <div className="flex items-center gap-4">
                  <span>
                    Showing{" "}
                    <span className="font-semibold">
                      {filteredFeeSettings.length}
                    </span>{" "}
                    fee setting{filteredFeeSettings.length !== 1 ? "s" : ""}
                  </span>
                  {searchTerm && (
                    <span className="px-2 py-1 text-xs rounded-md bg-slate-100">
                      Search: "{searchTerm}"
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">
                      Total Configured
                    </div>
                    <div className="font-bold text-emerald-700">
                      MWK{" "}
                      {filteredFeeSettings
                        .reduce((sum, fs) => sum + fs.amount, 0)
                        .toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
