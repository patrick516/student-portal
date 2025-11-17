import { useEffect, useState } from "react";
import { api } from "@/api/client";
import { useApp } from "@/app/state/useApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Band = { min: number; max: number; grade: string; points: number };

export default function GradeSchemePage() {
  const { selectedClassId } = useApp();
  const [bands, setBands] = useState<Band[]>([
    { min: 80, max: 100, grade: "Dist", points: 1 },
    { min: 70, max: 79, grade: "Merit", points: 2 },
    { min: 60, max: 69, grade: "Credit", points: 3 },
    { min: 50, max: 59, grade: "Pass", points: 4 },
    { min: 0, max: 49, grade: "Fail", points: 9 },
  ]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!selectedClassId) return;
    setSaving(true);
    try {
      await api.post("/api/exams/gradescheme", {
        classId: selectedClassId,
        bands,
      });
      alert("Grade scheme saved");
    } finally {
      setSaving(false);
    }
  };

  const addBand = () =>
    setBands((prev) => [...prev, { min: 0, max: 0, grade: "", points: 9 }]);
  const delBand = (i: number) =>
    setBands((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Grade Scheme</h1>
      <Card>
        <CardHeader>
          <CardTitle>Class Bands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bands.map((b, i) => (
              <div key={i} className="grid items-center grid-cols-12 gap-2">
                <Input
                  type="number"
                  value={b.min}
                  onChange={(e) =>
                    setBands((prev) =>
                      prev.map((x, idx) =>
                        idx === i ? { ...x, min: Number(e.target.value) } : x
                      )
                    )
                  }
                  className="col-span-2"
                  placeholder="Min"
                />
                <Input
                  type="number"
                  value={b.max}
                  onChange={(e) =>
                    setBands((prev) =>
                      prev.map((x, idx) =>
                        idx === i ? { ...x, max: Number(e.target.value) } : x
                      )
                    )
                  }
                  className="col-span-2"
                  placeholder="Max"
                />
                <Input
                  value={b.grade}
                  onChange={(e) =>
                    setBands((prev) =>
                      prev.map((x, idx) =>
                        idx === i ? { ...x, grade: e.target.value } : x
                      )
                    )
                  }
                  className="col-span-4"
                  placeholder="Grade (e.g., Dist)"
                />
                <Input
                  type="number"
                  value={b.points}
                  onChange={(e) =>
                    setBands((prev) =>
                      prev.map((x, idx) =>
                        idx === i ? { ...x, points: Number(e.target.value) } : x
                      )
                    )
                  }
                  className="col-span-2"
                  placeholder="Points"
                />
                <Button
                  variant="outline"
                  onClick={() => delBand(i)}
                  className="col-span-2"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={addBand}>
              Add Band
            </Button>
            <Button onClick={save} disabled={saving || !selectedClassId}>
              {saving ? "Saving..." : "Save Scheme"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
