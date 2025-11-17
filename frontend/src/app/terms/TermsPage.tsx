// frontend/src/app/terms/TermsPage.tsx
import { useEffect, useState } from "react";
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

export default function TermsPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [form, setForm] = useState({
    name: "",
    year: "",
    startDate: "",
    endDate: "",
    isActive: false,
    isReadOnly: false,
  });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await api.get("/api/terms");
    setTerms(data.data || []);
  };

  useEffect(() => {
    load();
  }, []);

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
      setForm({
        name: "",
        year: "",
        startDate: "",
        endDate: "",
        isActive: false,
        isReadOnly: false,
      });
      load();
    } finally {
      setLoading(false);
    }
  };

  const setActive = async (id: string) => {
    await api.post(`/api/terms/${id}/activate`);
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Terms</h1>

      <Card>
        <CardHeader>
          <CardTitle>Create Term</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Name (e.g., Term 1)</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Year</Label>
              <Input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>End Date</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isReadOnly} // still works
                  onChange={
                    (e) => setForm({ ...form, isActive: e.target.checked }) // still works
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
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Terms</CardTitle>
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
                  <tr key={t.id} className="border-b last:border-none">
                    <td className="py-2 pr-3">{t.name}</td>
                    <td className="py-2 pr-3">{t.year}</td>
                    <td className="py-2 pr-3">{t.startDate.slice(0, 10)}</td>
                    <td className="py-2 pr-3">{t.endDate.slice(0, 10)}</td>
                    <td className="py-2 pr-3">
                      {t.isActive ? (
                        <span className="text-[hsl(var(--secondary))] font-medium">
                          Active
                        </span>
                      ) : (
                        <span className="text-[hsl(var(--muted-foreground))]">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <Button
                        variant="outline"
                        disabled={t.isActive}
                        onClick={() => setActive(t.id)}
                      >
                        Set Active
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
