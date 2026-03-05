import { useState, useEffect } from "react";
import { api } from "@/api/client";
import { useApp } from "@/app/state/useApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  Save,
  Award,
  Percent,
  Hash,
  Type,
  XCircle,
  Edit,
  Download,
  Upload,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertCircle,
  Calculator,
  BookOpen,
  Star,
  // Users,
  // Calendar,
  FileText,
} from "lucide-react";

type Band = { min: number; max: number; grade: string; points: number };

type GradeScheme = {
  id?: string;
  classId: string;
  bands: Band[];
  createdAt?: string;
};

export default function GradeSchemePage() {
  const { selectedClassId } = useApp();
  const [bands, setBands] = useState<Band[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentScheme, setCurrentScheme] = useState<GradeScheme | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  // Load existing grade scheme
  useEffect(() => {
    const loadScheme = async () => {
      if (!selectedClassId) {
        setCurrentScheme(null);
        setBands([]);
        return;
      }

      setLoading(true);
      try {
        const { data } = await api.get(`/api/exams/gradescheme`, {
          params: { classId: selectedClassId },
        });

        if (
          data &&
          data.bands &&
          Array.isArray(data.bands) &&
          data.bands.length > 0
        ) {
          // Sort bands by min score (lowest to highest)
          const sortedBands = [...data.bands].sort(
            (a: Band, b: Band) => a.min - b.min,
          );
          setBands(sortedBands);
          setCurrentScheme({
            ...data,
            bands: sortedBands,
          });
        } else {
          setCurrentScheme(null);
          setBands([]);
        }
      } catch (error) {
        // No existing scheme found
        setCurrentScheme(null);
        setBands([]);
      } finally {
        setLoading(false);
      }
    };

    loadScheme();
  }, [selectedClassId]);

  const saveScheme = async () => {
    if (!selectedClassId) {
      alert("Please select a class first");
      return;
    }

    // Validate bands
    if (bands.length === 0) {
      alert("Please add at least one grade band");
      return;
    }

    // Sort bands by min score
    const sortedBands = [...bands].sort((a, b) => a.min - b.min);

    // Validate bands have no gaps and cover 0-100 range
    let prevMax = -1;
    for (let i = 0; i < sortedBands.length; i++) {
      const band = sortedBands[i];

      // Check if min and max are valid numbers
      if (isNaN(band.min) || isNaN(band.max)) {
        alert(`Band ${i + 1}: Please enter valid numbers for score range`);
        return;
      }

      // Check if min <= max
      if (band.min > band.max) {
        alert(
          `Band ${i + 1}: Minimum (${
            band.min
          }) cannot be greater than Maximum (${band.max})`,
        );
        return;
      }

      // Check for overlapping or gaps
      if (i === 0) {
        if (band.min !== 0) {
          alert(`First band must start from 0%`);
          return;
        }
      } else {
        if (band.min !== prevMax + 1) {
          alert(
            `Gap detected: Range ${prevMax + 1}-${band.min - 1}% is not covered`,
          );
          return;
        }
      }

      // Check last band ends at 100
      if (i === sortedBands.length - 1 && band.max !== 100) {
        alert(`Last band must end at 100% (currently ends at ${band.max}%)`);
        return;
      }

      prevMax = band.max;

      // Check if grade is filled
      if (!band.grade.trim()) {
        alert(`Band ${i + 1}: Please enter a grade label`);
        return;
      }

      // Check if points is valid
      if (isNaN(band.points) || band.points < 0) {
        alert(`Band ${i + 1}: Please enter valid points (0 or greater)`);
        return;
      }
    }

    setSaving(true);
    try {
      const response = await api.post("/api/exams/gradescheme", {
        classId: selectedClassId,
        bands: sortedBands,
      });

      setCurrentScheme({
        ...response.data,
        classId: selectedClassId,
        bands: sortedBands,
      });

      setShowModal(false);
      alert("✓ Grade scheme saved successfully!");
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to save grade scheme");
    } finally {
      setSaving(false);
    }
  };

  const addBand = () => {
    let newMin = 0;
    let newMax = 100;

    if (bands.length > 0) {
      const lastBand = bands[bands.length - 1];
      newMin = lastBand.max + 1;
      if (newMin > 100) newMin = 100;
      newMax = 100;
    }

    setBands((prev) => [
      ...prev,
      { min: newMin, max: newMax, grade: "", points: bands.length + 1 },
    ]);
  };

  const deleteBand = (index: number) => {
    if (bands.length <= 1) {
      alert("Cannot delete the last band");
      return;
    }
    setBands((prev) => prev.filter((_, idx) => idx !== index));
  };

  const moveBandUp = (index: number) => {
    if (index === 0) return;
    const newBands = [...bands];
    [newBands[index], newBands[index - 1]] = [
      newBands[index - 1],
      newBands[index],
    ];
    setBands(newBands);
  };

  const moveBandDown = (index: number) => {
    if (index === bands.length - 1) return;
    const newBands = [...bands];
    [newBands[index], newBands[index + 1]] = [
      newBands[index + 1],
      newBands[index],
    ];
    setBands(newBands);
  };

  const getGradeForScore = (score: number) => {
    const band = bands.find((b) => score >= b.min && score <= b.max);
    return band ? { grade: band.grade, points: band.points } : null;
  };

  const resetToDefault = () => {
    // Common grading scheme as suggestion
    const defaultBands = [
      { min: 0, max: 39, grade: "Fail", points: 9 },
      { min: 40, max: 49, grade: "Pass", points: 8 },
      { min: 50, max: 59, grade: "Credit", points: 7 },
      { min: 60, max: 69, grade: "B", points: 6 },
      { min: 70, max: 79, grade: "B+", points: 5 },
      { min: 80, max: 89, grade: "A", points: 4 },
      { min: 90, max: 100, grade: "A+", points: 3 },
    ];
    setBands(defaultBands);
  };

  const exportScheme = () => {
    const data = {
      classId: selectedClassId,
      bands: bands,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grade-scheme-class-${selectedClassId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importScheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (data.bands && Array.isArray(data.bands) && data.bands.length > 0) {
          setBands(data.bands);
          alert("✓ Grade scheme imported successfully!");
        } else {
          alert("Invalid grade scheme file format");
        }
      } catch (error) {
        alert("Failed to parse grade scheme file");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const startNewScheme = () => {
    setBands([]);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-purple-50/20 to-pink-50/30">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg shadow-purple-200/50">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-transparent bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text">
                Grade Scheme Management
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Define grading bands and points for student assessments
              </p>
            </div>
          </div>
        </div>

        {/* Current Scheme Card */}
        <Card className="overflow-hidden border-none shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-purple-50/30 border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-800">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  <div>
                    Current Grade Scheme
                    {currentScheme && (
                      <div className="text-sm font-normal text-slate-500">
                        Last updated:{" "}
                        {new Date(
                          currentScheme.createdAt || "",
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CardTitle>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={exportScheme}
                  disabled={
                    !selectedClassId || !currentScheme || bands.length === 0
                  }
                  className="flex items-center gap-2 px-4 font-semibold h-11 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Export
                </Button>
                <label className="cursor-pointer flex items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={!selectedClassId}
                    className="flex items-center gap-2 px-4 font-semibold text-purple-700 border-purple-200 h-11 hover:bg-purple-50 rounded-xl disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    Import
                  </Button>
                  <input
                    type="file"
                    accept=".json"
                    onChange={importScheme}
                    className="hidden"
                    disabled={!selectedClassId}
                  />
                </label>
                <Button
                  onClick={() => {
                    if (currentScheme) {
                      setShowModal(true);
                    } else {
                      startNewScheme();
                    }
                  }}
                  disabled={!selectedClassId}
                  className="flex items-center gap-2 px-6 font-semibold text-white transition-all shadow-lg h-11 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl shadow-purple-200/50 hover:shadow-xl disabled:opacity-50"
                >
                  {currentScheme ? (
                    <>
                      <Edit className="w-4 h-4" />
                      Edit Scheme
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Scheme
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 mb-3 text-purple-600 animate-spin" />
                <p className="text-sm font-medium text-slate-600">
                  Loading grade scheme...
                </p>
              </div>
            ) : !selectedClassId ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <AlertCircle className="w-12 h-12 text-slate-300" />
                <div>
                  <p className="font-medium text-slate-600">
                    No class selected
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Please select a class to view or create grade scheme
                  </p>
                </div>
              </div>
            ) : !currentScheme || bands.length === 0 ? (
              <div className="flex flex-col items-center gap-6 py-12 text-center">
                <div className="p-4 rounded-full bg-gradient-to-br from-purple-100 to-pink-100">
                  <Star className="w-16 h-16 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    No Grade Scheme Defined
                  </h3>
                  <p className="max-w-md mx-auto mt-2 text-slate-600">
                    Create a custom grading scheme for this class. Define score
                    ranges, corresponding grades, and points for GPA
                    calculation.
                  </p>
                </div>
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="outline"
                    onClick={resetToDefault}
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Use Template
                  </Button>
                  <Button
                    onClick={startNewScheme}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600"
                  >
                    <Plus className="w-4 h-4" />
                    Start From Scratch
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Grade Bands Preview */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold tracking-wider uppercase text-slate-700">
                      Grade Bands ({bands.length} bands)
                    </h3>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        {showPreview ? "Hide Preview" : "Show Preview"}
                      </Button>
                    </div>
                  </div>

                  {showPreview && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {bands.map((band, index) => (
                        <div
                          key={index}
                          className="p-4 transition-all bg-white border border-slate-200 rounded-xl hover:border-purple-300 hover:shadow-md"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100">
                                <Percent className="w-4 h-4 text-purple-600" />
                              </div>
                              <div>
                                <span className="text-lg font-bold text-slate-900">
                                  {band.grade}
                                </span>
                                <div className="text-xs text-slate-500">
                                  Band {index + 1}
                                </div>
                              </div>
                            </div>
                            <div className="px-3 py-1 rounded-full bg-slate-100">
                              <span className="text-xs font-semibold text-slate-700">
                                {band.points} pts
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500">
                                Score Range
                              </span>
                              <span className="font-semibold text-slate-900">
                                {band.min} - {band.max}%
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-200">
                              <div
                                className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                                style={{
                                  width: `${
                                    ((band.max - band.min) / 100) * 100
                                  }%`,
                                }}
                              />
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Covers {band.max - band.min + 1}% of scores
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Test Score */}
                <div className="p-4 border border-slate-200 rounded-xl bg-gradient-to-r from-slate-50 to-purple-50/30">
                  <h3 className="mb-3 text-sm font-semibold tracking-wider uppercase text-slate-700">
                    Test Score Calculator
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Enter score (0-100)"
                        className="pl-10 h-11 border-slate-200 rounded-xl focus:border-purple-400 focus:ring-purple-400/20"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const input = e.target as HTMLInputElement;
                            const score = parseInt(input.value);
                            if (!isNaN(score) && score >= 0 && score <= 100) {
                              const gradeInfo = getGradeForScore(score);
                              if (gradeInfo) {
                                alert(
                                  `Score: ${score}%\nGrade: ${gradeInfo.grade}\nPoints: ${gradeInfo.points}`,
                                );
                              } else {
                                alert(
                                  `Score ${score}% is not within any defined grade band`,
                                );
                              }
                            } else {
                              alert("Please enter a valid score between 0-100");
                            }
                            input.value = "";
                          }
                        }}
                      />
                      <Calculator className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                    </div>
                    <Button
                      variant="outline"
                      className="text-purple-700 border-purple-200 h-11 hover:bg-purple-50 rounded-xl"
                      onClick={() => {
                        const scoreInput = document.querySelector(
                          'input[type="number"]',
                        ) as HTMLInputElement;
                        if (scoreInput) {
                          const score = parseInt(scoreInput.value);
                          if (!isNaN(score) && score >= 0 && score <= 100) {
                            const gradeInfo = getGradeForScore(score);
                            if (gradeInfo) {
                              alert(
                                `Score: ${score}%\nGrade: ${gradeInfo.grade}\nPoints: ${gradeInfo.points}`,
                              );
                            } else {
                              alert(
                                `Score ${score}% is not within any defined grade band`,
                              );
                            }
                          } else {
                            alert("Please enter a valid score between 0-100");
                          }
                          scoreInput.value = "";
                        }
                      }}
                    >
                      Check Grade
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Enter a score and press Enter or click "Check Grade" to see
                    the corresponding grade
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grade Scheme Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-4xl bg-white shadow-2xl rounded-2xl animate-in zoom-in-95 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b bg-gradient-to-r from-slate-50 to-purple-50/30 border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg shadow-md bg-gradient-to-br from-purple-500 to-pink-600">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {currentScheme
                      ? "Edit Grade Scheme"
                      : "Create New Grade Scheme"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Define score ranges and corresponding grades
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 transition-colors rounded-lg hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 p-6 overflow-y-auto">
              {/* Instructions */}
              <div className="p-4 mb-6 border border-blue-100 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800">
                      Important Guidelines:
                    </p>
                    <ul className="mt-2 space-y-1 text-blue-700">
                      <li>
                        • <strong>Cover entire range:</strong> Bands must cover
                        0-100% without gaps
                      </li>
                      <li>
                        • <strong>Sequential order:</strong> First band starts
                        at 0%, last ends at 100%
                      </li>
                      <li>
                        • <strong>No overlaps:</strong> Each band must follow
                        the previous one (e.g., 0-39, 40-49, etc.)
                      </li>
                      <li>
                        • <strong>Points:</strong> Lower points = better grade
                        (e.g., A=1, B=2, etc.)
                      </li>
                      <li>
                        • <strong>Rearrange:</strong> Use arrows to adjust band
                        order if needed
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Grade Bands Editor */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-wider uppercase text-slate-700">
                    Grade Bands ({bands.length})
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetToDefault}
                      className="text-xs"
                    >
                      Use Template
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBands([])}
                      disabled={bands.length === 0}
                      className="text-xs text-red-600 border-red-200 hover:text-red-700 hover:border-red-300"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                {bands.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-300 rounded-xl">
                    <div className="p-4 mb-4 rounded-full bg-slate-100">
                      <Award className="w-12 h-12 text-slate-400" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-700">
                      No grade bands added yet
                    </h3>
                    <p className="max-w-md mb-6 text-slate-500">
                      Add your first grade band to define the grading scheme.
                      Start with the lowest passing score or use the template
                      for common grading patterns.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={resetToDefault}
                        className="flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Use Template
                      </Button>
                      <Button
                        onClick={addBand}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600"
                      >
                        <Plus className="w-4 h-4" />
                        Add First Band
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bands.map((band, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-3 p-4 transition-colors bg-white border border-slate-200 rounded-xl hover:border-purple-300"
                      >
                        {/* Move Controls and Band Number */}
                        <div className="flex flex-col items-center justify-center col-span-1 gap-2">
                          <button
                            onClick={() => moveBandUp(index)}
                            disabled={index === 0}
                            className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4 text-slate-500" />
                          </button>
                          <div className="px-2 py-1 rounded-md bg-slate-100 min-w-[30px] text-center">
                            <span className="text-xs font-bold text-slate-700">
                              {index + 1}
                            </span>
                          </div>
                          <button
                            onClick={() => moveBandDown(index)}
                            disabled={index === bands.length - 1}
                            className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          </button>
                        </div>

                        {/* Score Range */}
                        <div className="col-span-3">
                          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                            <div className="flex items-center gap-1">
                              <Percent className="w-3 h-3" />
                              Score Range %
                            </div>
                          </Label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={band.min}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  if (
                                    !isNaN(value) &&
                                    value >= 0 &&
                                    value <= 100
                                  ) {
                                    setBands((prev) =>
                                      prev.map((x, idx) =>
                                        idx === index
                                          ? { ...x, min: value }
                                          : x,
                                      ),
                                    );
                                  }
                                }}
                                className="text-sm rounded-lg h-9 border-slate-200"
                                placeholder="Min"
                              />
                              <div className="absolute text-xs transform -translate-y-1/2 right-2 top-1/2 text-slate-400">
                                %
                              </div>
                            </div>
                            <span className="font-medium text-slate-400">
                              to
                            </span>
                            <div className="relative flex-1">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={band.max}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  if (
                                    !isNaN(value) &&
                                    value >= 0 &&
                                    value <= 100
                                  ) {
                                    setBands((prev) =>
                                      prev.map((x, idx) =>
                                        idx === index
                                          ? { ...x, max: value }
                                          : x,
                                      ),
                                    );
                                  }
                                }}
                                className="text-sm rounded-lg h-9 border-slate-200"
                                placeholder="Max"
                              />
                              <div className="absolute text-xs transform -translate-y-1/2 right-2 top-1/2 text-slate-400">
                                %
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Grade */}
                        <div className="col-span-3">
                          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                            <div className="flex items-center gap-1">
                              <Type className="w-3 h-3" />
                              Grade Label
                            </div>
                          </Label>
                          <div className="relative">
                            <Input
                              value={band.grade}
                              onChange={(e) =>
                                setBands((prev) =>
                                  prev.map((x, idx) =>
                                    idx === index
                                      ? { ...x, grade: e.target.value }
                                      : x,
                                  ),
                                )
                              }
                              className="text-sm rounded-lg h-9 border-slate-200 pl-9"
                              placeholder="e.g., A, Dist, Pass"
                            />
                            <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </div>

                        {/* Points */}
                        <div className="col-span-2">
                          <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                            <div className="flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              Points
                            </div>
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="12"
                              step="0.5"
                              value={band.points}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value) && value >= 0) {
                                  setBands((prev) =>
                                    prev.map((x, idx) =>
                                      idx === index
                                        ? { ...x, points: value }
                                        : x,
                                    ),
                                  );
                                }
                              }}
                              className="text-sm rounded-lg h-9 border-slate-200 pl-9"
                              placeholder="e.g., 1.0"
                            />
                            <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </div>

                        {/* Delete */}
                        <div className="flex items-end justify-end col-span-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteBand(index)}
                            className="px-3 text-xs text-red-600 border-red-200 h-9 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Add Band Button */}
                    <Button
                      variant="outline"
                      onClick={addBand}
                      className="w-full mt-4 border-dashed h-11 border-slate-300 hover:border-solid hover:border-purple-400 hover:bg-purple-50 text-slate-600 hover:text-purple-700 rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Another Grade Band
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-6 py-4 border-t bg-slate-50/50 border-slate-100">
              <Button
                onClick={() => setShowModal(false)}
                variant="outline"
                className="flex-1 font-semibold transition-all h-11 border-slate-300 hover:bg-slate-100 rounded-xl"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={saveScheme}
                disabled={saving || !selectedClassId || bands.length === 0}
                className="flex-1 px-8 font-semibold text-white transition-all shadow-lg h-11 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl shadow-purple-200/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {currentScheme ? "Update Scheme" : "Save Grade Scheme"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
