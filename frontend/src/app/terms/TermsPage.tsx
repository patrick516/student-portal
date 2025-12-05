// frontend/src/app/terms/TermsPage.tsx
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      void load();
    } finally {
      setLoading(false);
    }
  };

  const setActive = async (id: string) => {
    await api.post(`/api/terms/${id}/activate`);
    void load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Terms</h1>

      <Card className="border-none shadow-sm bg-white/95 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Create Term</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Name (e.g., Term 1)</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Year</Label>
              <Input
                type="number"
                value={form.year}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, year: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, startDate: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>End Date</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[hsl(var(--border))]"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                />
                Set as current active term
              </label>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              onClick={createTerm}
              disabled={
                !form.name.trim() ||
                !form.year ||
                !form.startDate ||
                !form.endDate ||
                loading
              }
              className="px-4"
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-white/95 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">All Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Year</th>
                  <th className="py-2 pr-3">Start</th>
                  <th className="py-2 pr-3">End</th>
                  <th className="py-2 pr-3">Active</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {terms.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b last:border-none hover:bg-[hsl(var(--muted))]/40 transition-colors"
                  >
                    <td className="py-2 pr-3">{t.name}</td>
                    <td className="py-2 pr-3">{t.year}</td>
                    <td className="py-2 pr-3">{t.startDate.slice(0, 10)}</td>
                    <td className="py-2 pr-3">{t.endDate.slice(0, 10)}</td>
                    <td className="py-2 pr-3">
                      {t.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--muted-foreground))]">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <Button
                        variant="outline"
                        disabled={t.isActive}
                        onClick={() => void setActive(t.id)}
                        className="px-3 text-xs"
                      >
                        {t.isActive ? "Current" : "Set Active"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {terms.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-[hsl(var(--muted-foreground))]"
                    >
                      No terms created.
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
