import { useEffect, useMemo, useState } from "react";
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

type Subject = { id: string; name: string; code?: string | null };

export default function SubjectsPage() {
  const [rows, setRows] = useState<Subject[]>([]);
  const [q, setQ] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({ name: "", code: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await api.get("/api/subjects");
    setRows((data?.data as Subject[]) || []);
  };
  useEffect(() => {
    load();
  }, []);

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
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Subjects</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-72"
          />
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button>Add Subject</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Subject</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Mathematics"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Code (optional)</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="MATH"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpenAdd(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addSubject} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subjects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Code</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b last:border-none">
                    <td className="py-2 pr-3">{s.name}</td>
                    <td className="py-2 pr-3">{s.code || "-"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="py-8 text-center text-[hsl(var(--muted-foreground))]"
                    >
                      No subjects
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
