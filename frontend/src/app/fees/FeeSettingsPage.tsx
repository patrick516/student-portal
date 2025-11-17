// frontend/src/app/fees/FeeSettingsPage.tsx
import { useEffect, useState } from "react";
import { api } from "@/api/client";
import { useApp } from "@/app/state/useApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Term = { id: string; name: string; year: number; isActive: boolean };
type FeeSetting = {
  id: string;
  schoolId: string;
  termId: string;
  classId: string;
  amount: number;
};

export default function FeeSettingsPage() {
  const { classes } = useApp();
  const [terms, setTerms] = useState<Term[]>([]);
  const [feeSettings, setFeeSettings] = useState<FeeSetting[]>([]);

  const [selectedTermId, setSelectedTermId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTerms = async () => {
    const { data } = await api.get("/api/terms");
    const list: Term[] = data.data || [];
    setTerms(list);
    const active = list.find((t) => t.isActive);
    if (active && !selectedTermId) setSelectedTermId(active.id);
  };

  const loadFeeSettings = async () => {
    const { data } = await api.get("/api/fee-settings");
    setFeeSettings(data.data || []);
  };

  useEffect(() => {
    loadTerms();
    loadFeeSettings();
  }, []);

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
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.error || "Failed to save fee setting");
    } finally {
      setSaving(false);
    }
  };

  const findTerm = (id: string) => terms.find((t) => t.id === id);
  const findClass = (id: string) => classes.find((c) => c.id === id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Fee Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Set Required Fee per Term & Class</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Term</Label>
              <select
                className="h-10 rounded-md bg-[hsl(var(--input))] px-3 text-sm border border-[hsl(var(--border))]"
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
              >
                <option value="">Select term</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.year} • {t.name}
                    {t.isActive ? " (Active)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <Label>Class</Label>
              <select
                className="h-10 rounded-md bg-[hsl(var(--input))] px-3 text-sm border border-[hsl(var(--border))]"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.stream ? ` ${c.stream}` : ""}
                    {c.year ? ` • ${c.year}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <Label>Required Fee Amount</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 400000"
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configured Fees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-2 pr-3">Term</th>
                  <th className="py-2 pr-3">Class</th>
                  <th className="py-2 pr-3">Required Fee</th>
                </tr>
              </thead>
              <tbody>
                {feeSettings.map((f) => {
                  const term = findTerm(f.termId);
                  const klass = findClass(f.classId);
                  return (
                    <tr key={f.id} className="border-b last:border-none">
                      <td className="py-2 pr-3">
                        {term
                          ? `${term.year} • ${term.name}${
                              term.isActive ? " (Active)" : ""
                            }`
                          : f.termId}
                      </td>
                      <td className="py-2 pr-3">
                        {klass
                          ? `${klass.name}${
                              klass.stream ? " " + klass.stream : ""
                            }${klass.year ? " • " + klass.year : ""}`
                          : f.classId}
                      </td>
                      <td className="py-2 pr-3">
                        {Number(f.amount).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                {feeSettings.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-8 text-center text-[hsl(var(--muted-foreground))]"
                    >
                      No fee settings defined yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
