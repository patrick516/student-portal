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
  const studentLabel = (id: string): string => {
    const info = students[id];
    if (!info) return id;
    return `${info.code} • ${info.name}`;
  };

  const filteredInvoices = useMemo(() => {
    const s = q.toLowerCase();
    return invoices.filter((i) => {
      const label = studentLabel(i.studentId).toLowerCase();
      return s ? (label + i.status + i.id).toLowerCase().includes(s) : true;
    });
  }, [invoices, q, students]);

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
  }, [payments, q, students]);

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
          ).toUpperCase()} • ${Number(i.amount).toLocaleString()}`,
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
    } • Amount: ${
      r.invoice.amount != null ? Number(r.invoice.amount).toLocaleString() : "-"
    }</td></tr>
            <tr><th>Payment Amount</th><td>${Number(
              r.amount
            ).toLocaleString()}</td></tr>
            <tr><th>Method</th><td>${r.method || "-"}</td></tr>
            <tr><th>Reference</th><td>${r.reference || "-"}</td></tr>
          </tbody>
        </table>
        <p class="muted">Thank you.</p>
      </body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Fees</h1>
        <div className="flex items-center gap-2">
          {/* Term selector */}
          <select
            className="h-9 rounded-md bg-[hsl(var(--input))] px-3 text-sm border border-[hsl(var(--border))] shadow-sm"
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
          <Input
            placeholder="Search by student or status…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-56"
          />
          {/* Add Invoice */}
          <Dialog open={openInv} onOpenChange={setOpenInv}>
            <DialogTrigger asChild>
              <Button>Add Invoice</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Invoice</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Student (from selected class)</Label>
                  <Input
                    placeholder={
                      selectedClassId
                        ? "Type to search student…"
                        : "Select a class first (top bar)"
                    }
                    value={selectedStudent ? selectedStudent.label : studQuery}
                    onChange={(e) => {
                      setSelectedStudent(null);
                      setStudQuery(e.target.value);
                    }}
                    disabled={!selectedClassId}
                  />
                  {selectedStudent === null && studQuery && selectedClassId && (
                    <div className="mt-1 overflow-auto bg-white border rounded-md max-h-40">
                      {studOpts.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          No matches
                        </div>
                      )}
                      {studOpts.map((opt) => (
                        <div
                          key={opt.id}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
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
                <div className="grid gap-1.5">
                  <Label>Amount (required fee for this term)</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 400000"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpenInv(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={addInvoice}
                    disabled={!selectedStudent || !amount}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Record Payment */}
          <Dialog open={openPay} onOpenChange={setOpenPay}>
            <DialogTrigger asChild>
              <Button variant="outline">Record Payment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Student (from selected class)</Label>
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
                  />
                  {payStudent === null &&
                    payStudentQuery &&
                    selectedClassId && (
                      <div className="mt-1 overflow-auto bg-white border rounded-md max-h-40">
                        {payStudOpts.length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            No matches
                          </div>
                        )}
                        {payStudOpts.map((opt) => (
                          <div
                            key={opt.id}
                            className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
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
                <div className="grid gap-1.5">
                  <Label>Invoice</Label>
                  <select
                    className="h-10 rounded-md bg-[hsl(var(--input))] px-3 text-sm border border-[hsl(var(--border))]"
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
                </div>
                <div className="grid gap-1.5">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Method (optional)</Label>
                  <Input
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    placeholder="cash / bank / mobile money"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Reference (optional)</Label>
                  <Input
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpenPay(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={addPayment}
                    disabled={!payStudent || !selectedInvId || !payAmount}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Invoices list */}
      <Card className="border-none shadow-sm bg-white/95 rounded-2xl">
        <CardHeader>
          <CardTitle>
            Invoices{" "}
            {loading && (
              <span className="ml-2 text-sm text-gray-500">Loading…</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Issued</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((i) => (
                  <tr
                    key={i.id}
                    className="border-b last:border-none hover:bg-[hsl(var(--muted))]/40 transition-colors"
                  >
                    <td className="py-2 pr-3">{i.id}</td>
                    <td className="py-2 pr-3">{studentLabel(i.studentId)}</td>
                    <td className="py-2 pr-3">
                      {Number(i.amount).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 uppercase">{i.status}</td>
                    <td className="py-2 pr-3">
                      {new Date(i.issuedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-[hsl(var(--muted-foreground))]"
                    >
                      No invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payments list */}
      <Card className="border-none shadow-sm bg-white/95 rounded-2xl">
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Invoice</th>
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Method</th>
                  <th className="py-2 pr-3">Ref</th>
                  <th className="py-2 pr-3">Paid At</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b last:border-none hover:bg-[hsl(var(--muted))]/40 transition-colors"
                  >
                    <td className="py-2 pr-3">{p.id}</td>
                    <td className="py-2 pr-3">{p.invoiceId}</td>
                    <td className="py-2 pr-3">{studentLabel(p.studentId)}</td>
                    <td className="py-2 pr-3">
                      {Number(p.amount).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">{p.method || "-"}</td>
                    <td className="py-2 pr-3">{p.reference || "-"}</td>
                    <td className="py-2 pr-3">
                      {new Date(p.paidAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => printReceipt(p.id)}
                      >
                        Print Receipt
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-[hsl(var(--muted-foreground))]"
                    >
                      No payments found.
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
