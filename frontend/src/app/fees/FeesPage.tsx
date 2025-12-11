import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { useApp } from "@/app/state/useApp";
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
import {
  DollarSign,
  Search,
  Calendar,
  User,
  FileText,
  CreditCard,
  Receipt,
  PlusCircle,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

type Invoice = {
  id: string;
  studentId: string;
  amount: number;
  status: "unpaid" | "partial" | "paid" | string;
  issuedAt: string;
  termId?: string | null;
};

type Payment = {
  id: string;
  invoiceId: string;
  studentId: string;
  amount: number;
  method?: string | null;
  reference?: string | null;
  paidAt: string;
};

type StudentOpt = { id: string; label: string };

type Term = { id: string; name: string; year: number; isActive: boolean };

type TermsResponse = { data: Term[] };
type InvoicesResponse = { data: Invoice[]; termId?: string | null };
type PaymentsResponse = { data: Payment[] };

// flexible student shape from /api/students
type StudentApi = {
  id: string;
  studentCode?: string;
  student_code?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
};

type StudentsResponse = { data: StudentApi[] };

type InvoiceByStudent = {
  id: string;
  status: "unpaid" | "partial" | "paid" | string;
  amount: number | string;
};
type InvoicesByStudentResponse = { data: InvoiceByStudent[] };

// helper: map studentId -> { code, name }
type StudentMap = Record<
  string,
  {
    code: string;
    name: string;
  }
>;

export default function FeesPage() {
  const { selectedClassId } = useApp();

  const [terms, setTerms] = useState<Term[]>([]);
  const [termId, setTermId] = useState<string>("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<StudentMap>({});
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // dialogs
  const [openInv, setOpenInv] = useState(false);
  const [openPay, setOpenPay] = useState(false);

  // Add invoice: student search within selected class
  const [studQuery, setStudQuery] = useState("");
  const [studOpts, setStudOpts] = useState<StudentOpt[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentOpt | null>(
    null
  );
  const [amount, setAmount] = useState("");

  // Record payment: student search (class-aware) + invoice dropdown
  const [payStudentQuery, setPayStudentQuery] = useState("");
  const [payStudOpts, setPayStudOpts] = useState<StudentOpt[]>([]);
  const [payStudent, setPayStudent] = useState<StudentOpt | null>(null);
  const [invOpts, setInvOpts] = useState<
    { id: string; label: string; amount: number }[]
  >([]);
  const [selectedInvId, setSelectedInvId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payRef, setPayRef] = useState("");

  // ---------- load terms ----------
  const loadTerms = useCallback(async () => {
    const { data } = await api.get<TermsResponse>("/api/terms");
    const list = data.data || [];
    setTerms(list);
    const active = list.find((t) => t.isActive);
    if (active && !termId) setTermId(active.id);
  }, [termId]);

  // ---------- load base students + fees for selected class/term ----------
  const loadFees = useCallback(
    async (overrideTermId?: string) => {
      setLoading(true);
      try {
        const termParam = overrideTermId || termId || undefined;

        // 1) students from /api/students (class-aware)
        let studentMap: StudentMap = {};
        if (selectedClassId) {
          const studRes = await api.get<StudentsResponse>("/api/students", {
            params: { classId: selectedClassId },
          });
          const arr: StudentApi[] = studRes.data.data || [];
          studentMap = arr.reduce<StudentMap>((acc, s) => {
            const code = s.studentCode ?? s.student_code ?? "";
            const first = s.firstName ?? s.first_name ?? "";
            const last = s.lastName ?? s.last_name ?? "";
            acc[s.id] = {
              code,
              name: `${first} ${last}`.trim(),
            };
            return acc;
          }, {});
        }
        setStudents(studentMap);

        // 2) invoices/payments (school-wide, we will filter on frontend by class via studentMap)
        const [inv, pay] = await Promise.all([
          api.get<InvoicesResponse>("/api/fees/invoices", {
            params: { termId: termParam, studentId: undefined },
          }),
          api.get<PaymentsResponse>("/api/fees/payments", {
            params: { termId: termParam, studentId: undefined },
          }),
        ]);
        const allInvoices = inv.data.data || [];
        const allPayments = pay.data.data || [];

        // If a class is selected, only keep invoices/payments for students in that class
        const filteredInv = selectedClassId
          ? allInvoices.filter((i) => studentMap[i.studentId])
          : allInvoices;
        const filteredPay = selectedClassId
          ? allPayments.filter((p) => studentMap[p.studentId])
          : allPayments;

        setInvoices(filteredInv);
        setPayments(filteredPay);

        // if backend returns a default term, adopt it
        if (!termId && inv.data.termId) {
          setTermId(inv.data.termId || "");
        }
      } finally {
        setLoading(false);
      }
    },
    [termId, selectedClassId]
  );

  useEffect(() => {
    void (async () => {
      await loadTerms();
      await loadFees();
    })();
  }, [loadTerms, loadFees]);

  useEffect(() => {
    if (termId) {
      void loadFees(termId);
    }
  }, [termId, loadFees]);

  // When class changes from topbar, reload fees
  useEffect(() => {
    void loadFees();
  }, [selectedClassId, loadFees]);

  // ---------- helpers ----------
  const studentLabel = useCallback(
    (id: string): string => {
      const info = students[id];
      if (!info) return id;
      return `${info.code} • ${info.name}`;
    },
    [students]
  );

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle size={12} />
            Paid
          </span>
        );
      case "partial":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
            <AlertCircle size={12} />
            Partial
          </span>
        );
      case "unpaid":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
            <Clock size={12} />
            Unpaid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {status}
          </span>
        );
    }
  };

  const filteredInvoices = useMemo(() => {
    const s = q.toLowerCase();
    return invoices.filter((i) => {
      const label = studentLabel(i.studentId).toLowerCase();
      return s ? (label + i.status + i.id).toLowerCase().includes(s) : true;
    });
  }, [invoices, q, studentLabel]);

  const filteredPayments = useMemo(() => {
    const s = q.toLowerCase();
    return payments.filter((p) => {
      const label = studentLabel(p.studentId).toLowerCase();
      return s
        ? (label + (p.method || "") + (p.reference || "") + p.invoiceId)
            .toLowerCase()
            .includes(s)
        : true;
    });
  }, [payments, q, studentLabel]);

  // ---------- class-aware student search for dialogs ----------
  const searchStudents = useCallback(
    async (term: string, setter: (opts: StudentOpt[]) => void) => {
      if (!selectedClassId) {
        setter([]);
        return;
      }
      const { data } = await api.get<StudentsResponse>("/api/students", {
        params: { search: term, classId: selectedClassId },
      });
      const opts: StudentOpt[] = (data.data || []).map((s) => {
        const code = s.studentCode ?? s.student_code ?? "";
        const first = s.firstName ?? s.first_name ?? "";
        const last = s.lastName ?? s.last_name ?? "";
        return {
          id: s.id,
          label: `${code} • ${first} ${last}`.trim(),
        };
      });
      setter(opts);
    },
    [selectedClassId]
  );

  // Add invoice: search
  useEffect(() => {
    if (openInv && studQuery.trim().length >= 1) {
      void searchStudents(studQuery, setStudOpts);
    } else {
      setStudOpts([]);
    }
  }, [studQuery, openInv, selectedClassId, searchStudents]);

  // Record payment: search
  useEffect(() => {
    if (openPay && payStudentQuery.trim().length >= 1) {
      void searchStudents(payStudentQuery, setPayStudOpts);
    } else {
      setPayStudOpts([]);
    }
  }, [payStudentQuery, openPay, selectedClassId, searchStudents]);

  // Load invoices for selected payStudent (for this term)
  useEffect(() => {
    const loadInvoicesForStudent = async () => {
      if (!payStudent) {
        setInvOpts([]);
        setSelectedInvId("");
        return;
      }
      const { data } = await api.get<InvoicesByStudentResponse>(
        "/api/fees/invoices",
        {
          params: {
            studentId: payStudent.id,
            termId: termId || undefined,
          },
        }
      );
      const opts =
        (data.data || []).map((i) => ({
          id: i.id,
          label: `${i.id.slice(0, 8)} • ${String(
            i.status || ""
          ).toUpperCase()} • MWK ${Number(i.amount).toLocaleString()}`,
          amount: Number(i.amount),
        })) ?? [];

      setInvOpts(opts);
      if (opts[0]) {
        setSelectedInvId(opts[0].id);
        setPayAmount(String(opts[0].amount));
      } else {
        setSelectedInvId("");
        setPayAmount("");
      }
    };

    void loadInvoicesForStudent();
  }, [payStudent, termId]);

  // ---------- actions ----------
  const addInvoice = async () => {
    if (!selectedClassId) {
      alert("Please select a class at the top first.");
      return;
    }
    if (!selectedStudent || !amount) return;
    await api.post("/api/fees/invoices", {
      studentId: selectedStudent.id,
      amount: Number(amount),
      termId: termId || undefined,
    });
    setSelectedStudent(null);
    setStudQuery("");
    setAmount("");
    setOpenInv(false);
    void loadFees();
  };

  const addPayment = async () => {
    if (!payStudent || !selectedInvId || !payAmount) return;
    await api.post("/api/fees/payments", {
      invoiceId: selectedInvId,
      studentId: payStudent.id,
      amount: Number(payAmount),
      method: payMethod.trim() || undefined,
      reference: payRef.trim() || undefined,
    });

    setPayStudent(null);
    setPayStudentQuery("");
    setInvOpts([]);
    setSelectedInvId("");
    setPayAmount("");
    setPayMethod("");
    setPayRef("");
    setOpenPay(false);
    void loadFees();
  };

  const printReceipt = async (paymentId: string) => {
    const { data } = await api.get(`/api/fees/payments/${paymentId}/receipt`);
    const r = data?.data;
    const w = window.open("", "_blank");
    if (!w || !r) return;
    w.document.write(`
      <html><head><title>Receipt ${r.receiptId}</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto;padding:24px;color:#111827}
        .head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
        .brand{font-weight:700;font-size:18px}
        .muted{color:#6b7280;font-size:12px}
        table{border-collapse:collapse;width:100%;margin-top:12px}
        th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
        th{background:#f3f4f6}
        .currency{font-weight:bold;color:#059669}
      </style>
      </head><body>
        <div class="head">
          <div class="brand">${r.school?.name || "School"}</div>
          <div class="muted">Receipt #${r.receiptId.slice(0, 8)}</div>
        </div>
        <div class="muted">Paid at: ${new Date(r.paidAt).toLocaleString()}</div>
        <table>
          <tbody>
            <tr><th>Student</th><td>${r.student.code} • ${r.student.name}${
      r.student.klass ? " (" + r.student.klass + ")" : ""
    }</td></tr>
            <tr><th>Invoice</th><td>${r.invoice.id || "-"} • ${
      r.invoice.status || "-"
    } • Amount: <span class="currency">MWK ${
      r.invoice.amount != null ? Number(r.invoice.amount).toLocaleString() : "-"
    }</span></td></tr>
            <tr><th>Payment Amount</th><td><span class="currency">MWK ${Number(
              r.amount
            ).toLocaleString()}</span></td></tr>
            <tr><th>Method</th><td>${r.method || "-"}</td></tr>
            <tr><th>Reference</th><td>${r.reference || "-"}</td></tr>
            <tr><th>Currency</th><td>Malawian Kwacha (MWK)</td></tr>
          </tbody>
        </table>
        <p class="muted">Thank you.</p>
      </body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  // Calculate totals
  const invoiceTotals = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paid = invoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + inv.amount, 0);
    const pending = invoices
      .filter((inv) => inv.status === "unpaid")
      .reduce((sum, inv) => sum + inv.amount, 0);
    const partial = invoices
      .filter((inv) => inv.status === "partial")
      .reduce((sum, inv) => sum + inv.amount, 0);

    return { total, paid, pending, partial };
  }, [invoices]);

  const paymentTotal = useMemo(() => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  }, [payments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shadow-lg">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Fees Management
            </h1>
            <p className="text-sm text-slate-600">
              Manage student invoices and payments
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Invoices
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  MWK {invoiceTotals.total.toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Paid Invoices
                </p>
                <p className="text-2xl font-bold text-emerald-700">
                  MWK {invoiceTotals.paid.toLocaleString()}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-100">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending</p>
                <p className="text-2xl font-bold text-rose-700">
                  MWK {invoiceTotals.pending.toLocaleString()}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-rose-100">
                <Clock className="w-5 h-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Payments
                </p>
                <p className="text-2xl font-bold text-indigo-700">
                  MWK {paymentTotal.toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-indigo-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Term selector */}
          <div className="relative">
            <Calendar className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
            <select
              className="h-10 pl-10 pr-4 text-sm transition-all duration-200 bg-white border shadow-sm cursor-pointer rounded-xl border-slate-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
            >
              <option value="">All Terms</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.year} • {t.name}
                  {t.isActive ? " (Active)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
            <Input
              placeholder="Search by student or status…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-sm border rounded-xl border-slate-300 sm:w-64"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Add Invoice */}
          <Dialog open={openInv} onOpenChange={setOpenInv}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <PlusCircle className="w-4 h-4" />
                Add Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <DialogTitle className="text-lg font-semibold text-slate-800">
                    Create New Invoice
                  </DialogTitle>
                </div>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <User className="w-4 h-4 text-blue-600" />
                    Student (from selected class)
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder={
                        selectedClassId
                          ? "Type to search student…"
                          : "Select a class first (top bar)"
                      }
                      value={
                        selectedStudent ? selectedStudent.label : studQuery
                      }
                      onChange={(e) => {
                        setSelectedStudent(null);
                        setStudQuery(e.target.value);
                      }}
                      disabled={!selectedClassId}
                      className="pl-10 pr-4 border h-11 rounded-xl border-slate-300"
                    />
                    <User className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                  </div>
                  {selectedStudent === null && studQuery && selectedClassId && (
                    <div className="mt-1 overflow-auto bg-white border shadow-sm border-slate-200 rounded-xl max-h-40">
                      {studOpts.length === 0 && (
                        <div className="px-3 py-2 text-sm text-slate-500">
                          No students found
                        </div>
                      )}
                      {studOpts.map((opt) => (
                        <div
                          key={opt.id}
                          className="px-3 py-2.5 text-sm cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                          onClick={() => {
                            setSelectedStudent(opt);
                            setStudQuery(opt.label);
                          }}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Amount
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
                      className="pr-4 border h-11 rounded-xl border-slate-300 pl-14"
                    />
                  </div>
                  {amount && Number(amount) > 0 && (
                    <div className="text-xs font-medium text-emerald-600">
                      {Number(amount).toLocaleString()} Malawian Kwacha
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setOpenInv(false)}
                    className="h-10 px-6 rounded-xl border-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={addInvoice}
                    disabled={!selectedStudent || !amount}
                    className="h-10 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    Create Invoice
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Record Payment */}
          <Dialog open={openPay} onOpenChange={setOpenPay}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 text-blue-700 border-blue-300 rounded-xl hover:bg-blue-50"
              >
                <CreditCard className="w-4 h-4" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <DialogTitle className="text-lg font-semibold text-slate-800">
                    Record Payment
                  </DialogTitle>
                </div>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <User className="w-4 h-4 text-blue-600" />
                    Student
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder={
                        selectedClassId
                          ? "Type to search student…"
                          : "Select a class first (top bar)"
                      }
                      value={payStudent ? payStudent.label : payStudentQuery}
                      onChange={(e) => {
                        setPayStudent(null);
                        setPayStudentQuery(e.target.value);
                      }}
                      disabled={!selectedClassId}
                      className="pl-10 pr-4 border h-11 rounded-xl border-slate-300"
                    />
                    <User className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                  </div>
                  {payStudent === null &&
                    payStudentQuery &&
                    selectedClassId && (
                      <div className="mt-1 overflow-auto bg-white border shadow-sm border-slate-200 rounded-xl max-h-40">
                        {payStudOpts.length === 0 && (
                          <div className="px-3 py-2 text-sm text-slate-500">
                            No students found
                          </div>
                        )}
                        {payStudOpts.map((opt) => (
                          <div
                            key={opt.id}
                            className="px-3 py-2.5 text-sm cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                            onClick={() => {
                              setPayStudent(opt);
                              setPayStudentQuery(opt.label);
                            }}
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Invoice
                  </Label>
                  <div className="relative">
                    <select
                      className="w-full pl-10 pr-4 text-sm transition-all duration-200 bg-white border shadow-sm cursor-pointer h-11 rounded-xl border-slate-300 hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                      value={selectedInvId}
                      onChange={(e) => setSelectedInvId(e.target.value)}
                      disabled={!payStudent || invOpts.length === 0}
                    >
                      {invOpts.length === 0 && (
                        <option value="">No invoices for this student</option>
                      )}
                      {invOpts.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.label}
                        </option>
                      ))}
                    </select>
                    <FileText className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Amount
                  </Label>
                  <div className="relative">
                    <div className="absolute font-medium -translate-y-1/2 left-3 top-1/2 text-slate-600">
                      MWK
                    </div>
                    <Input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="pr-4 border h-11 rounded-xl border-slate-300 pl-14"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Payment Method
                  </Label>
                  <select
                    className="px-4 text-sm transition-all duration-200 bg-white border shadow-sm cursor-pointer h-11 rounded-xl border-slate-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                  >
                    <option value="">Select method</option>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label className="text-sm font-semibold text-slate-700">
                    Reference (Optional)
                  </Label>
                  <Input
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="e.g., receipt number"
                    className="border h-11 rounded-xl border-slate-300"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setOpenPay(false)}
                    className="h-10 px-6 rounded-xl border-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={addPayment}
                    disabled={!payStudent || !selectedInvId || !payAmount}
                    className="h-10 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                  >
                    Record Payment
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Invoices Card */}
      <Card className="overflow-hidden shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg shadow bg-gradient-to-br from-blue-500 to-indigo-600">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-lg font-semibold text-slate-800">
                Invoices
              </CardTitle>
            </div>
            <div className="text-sm text-slate-600">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading…
                </div>
              ) : (
                `${filteredInvoices.length} invoice${
                  filteredInvoices.length !== 1 ? "s" : ""
                }`
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    ID
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Student
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Issued Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((i) => (
                  <tr
                    key={i.id}
                    className="transition-colors duration-200 group hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4">
                      <code className="px-2 py-1 font-mono text-xs rounded bg-slate-100 text-slate-700">
                        {i.id.slice(0, 8)}…
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 text-sm font-semibold text-blue-700 bg-blue-100 rounded-full">
                          {studentLabel(i.studentId)[0]}
                        </div>
                        <span className="font-medium text-slate-900">
                          {studentLabel(i.studentId)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900">
                        MWK {Number(i.amount).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(i.status)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(i.issuedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}

                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-full bg-slate-100">
                          <FileText className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">
                            No invoices found
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {q
                              ? "Try adjusting your search"
                              : "Start by creating an invoice"}
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

      {/* Payments Card */}
      <Card className="overflow-hidden shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg shadow bg-gradient-to-br from-emerald-500 to-green-600">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-lg font-semibold text-slate-800">
                Payments
              </CardTitle>
            </div>
            <div className="text-sm text-slate-600">
              {filteredPayments.length} payment
              {filteredPayments.length !== 1 ? "s" : ""}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    ID
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Invoice
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Student
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Method
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Paid Date
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left uppercase text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => (
                  <tr
                    key={p.id}
                    className="transition-colors duration-200 group hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4">
                      <code className="px-2 py-1 font-mono text-xs rounded bg-slate-100 text-slate-700">
                        {p.id.slice(0, 8)}…
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <code className="px-2 py-1 font-mono text-xs text-blue-700 rounded bg-blue-50">
                        {p.invoiceId.slice(0, 8)}…
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900">
                        {studentLabel(p.studentId)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-emerald-700">
                        MWK {Number(p.amount).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 text-xs font-medium text-indigo-700 capitalize rounded-full bg-indigo-50">
                        {p.method || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(p.paidAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => printReceipt(p.id)}
                        className="flex items-center gap-2 rounded-lg border-slate-300 hover:bg-slate-50"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        Receipt
                      </Button>
                    </td>
                  </tr>
                ))}

                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-full bg-slate-100">
                          <CreditCard className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">
                            No payments found
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {q
                              ? "Try adjusting your search"
                              : "Record a payment to get started"}
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
  );
}
