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
import {
  Search,
  UserPlus,
  Mail,
  Copy,
  Edit,
  Send,
  UserCheck,
  UserX,
  Shield,
  Eye,
  FileText,
  GraduationCap,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "teacher" | "bursar" | "viewer";
  isActive: boolean;
  mustChangePassword?: boolean;
};

const ROLE_OPTIONS: Array<{
  value: UserRow["role"];
  label: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    value: "admin",
    label: "Head Teacher (Admin)",
    icon: <Shield className="w-4 h-4" />,
    color: "from-purple-500 to-pink-500",
  },
  {
    value: "teacher",
    label: "Teacher",
    icon: <GraduationCap className="w-4 h-4" />,
    color: "from-blue-500 to-cyan-500",
  },
  {
    value: "bursar",
    label: "Bursar",
    icon: <FileText className="w-4 h-4" />,
    color: "from-emerald-500 to-green-500",
  },
  {
    value: "viewer",
    label: "Viewer (Read-only)",
    icon: <Eye className="w-4 h-4" />,
    color: "from-slate-500 to-slate-600",
  },
];

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [tempShown, setTempShown] = useState<{
    id: string;
    temp: string;
  } | null>(null);

  // Add user dialog
  const [openAdd, setOpenAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "teacher" as UserRow["role"],
  });

  // Edit user dialog
  const [openEdit, setOpenEdit] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "teacher" as UserRow["role"],
    isActive: true,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/users");
      setRows(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter((u) =>
      s ? (u.name + u.email + u.role).toLowerCase().includes(s) : true
    );
  }, [rows, q]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add toast notification here
    } catch {
      // ignore
    }
  };

  const resendInvite = async (id: string) => {
    setSendingId(id);
    try {
      const { data } = await api.post(`/api/users/${id}/resend-invite`);
      if (data?.tempPassword) {
        setTempShown({ id, temp: data.tempPassword });
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.error || "Failed to resend invite");
    } finally {
      setSendingId(null);
      load();
    }
  };

  const toggleActive = async (user: UserRow) => {
    try {
      await api.put(`/api/users/${user.id}`, { isActive: !user.isActive });
      load();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.error || "Failed to update status");
    }
  };

  const addUser = async () => {
    try {
      const { data } = await api.post("/api/users", {
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        password: addForm.password,
        role: addForm.role,
      });
      if (data?.tempPassword) {
        setTempShown({ id: data.id, temp: data.tempPassword });
      }
      setAddForm({ name: "", email: "", password: "", role: "teacher" });
      setOpenAdd(false);
      load();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.error || "Failed to create user");
    }
  };

  const openEditDialog = (u: UserRow) => {
    setEditUser(u);
    setEditForm({
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
    });
    setOpenEdit(true);
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setSavingEdit(true);
    try {
      await api.put(`/api/users/${editUser.id}`, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        isActive: editForm.isActive,
      });
      setOpenEdit(false);
      setEditUser(null);
      load();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.error || "Failed to update user");
    } finally {
      setSavingEdit(false);
    }
  };

  const getRoleBadge = (role: UserRow["role"]) => {
    const roleConfig = ROLE_OPTIONS.find((r) => r.value === role);
    if (!roleConfig) return null;

    return (
      <span
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r ${roleConfig.color} text-white`}
      >
        {roleConfig.icon}
        {roleConfig.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200/50">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-transparent bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text">
                User Management
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage user accounts and permissions
              </p>
            </div>
          </div>
        </div>

        {/* Search and Add Card */}
        <Card className="overflow-hidden border-none shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute w-5 h-5 transform -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                <Input
                  placeholder="Search users by name, email, or role..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-12 pl-10 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-indigo-400/20"
                />
              </div>

              {/* ADD USER DIALOG */}
              <Dialog open={openAdd} onOpenChange={setOpenAdd}>
                <DialogTrigger asChild>
                  <Button className="flex items-center h-12 gap-2 px-6 font-semibold text-white transition-all shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-indigo-200/50 hover:shadow-xl">
                    <UserPlus className="w-5 h-5" />
                    Add New User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg border-none shadow-2xl rounded-2xl">
                  <DialogHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg shadow-md bg-gradient-to-br from-indigo-500 to-purple-600">
                        <UserPlus className="w-5 h-5 text-white" />
                      </div>
                      <DialogTitle className="text-xl font-bold text-slate-800">
                        Create New User
                      </DialogTitle>
                    </div>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label className="text-sm font-semibold text-slate-700">
                        Full Name
                      </Label>
                      <Input
                        value={addForm.name}
                        onChange={(e) =>
                          setAddForm({ ...addForm, name: e.target.value })
                        }
                        placeholder="Enter user's full name"
                        className="h-11 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-indigo-400/20"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-sm font-semibold text-slate-700">
                        Email Address
                      </Label>
                      <Input
                        type="email"
                        value={addForm.email}
                        onChange={(e) =>
                          setAddForm({ ...addForm, email: e.target.value })
                        }
                        placeholder="user@school.org"
                        className="h-11 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-indigo-400/20"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-sm font-semibold text-slate-700">
                        Temporary Password
                      </Label>
                      <Input
                        type="password"
                        value={addForm.password}
                        onChange={(e) =>
                          setAddForm({ ...addForm, password: e.target.value })
                        }
                        placeholder="Set temporary password"
                        className="h-11 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-indigo-400/20"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-sm font-semibold text-slate-700">
                        Role
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        {ROLE_OPTIONS.map((r) => (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() =>
                              setAddForm({
                                ...addForm,
                                role: r.value,
                              })
                            }
                            className={`flex items-center gap-3 p-3 border rounded-xl transition-all ${
                              addForm.role === r.value
                                ? `border-indigo-500 bg-gradient-to-r ${r.color} bg-opacity-10`
                                : "border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div
                              className={`p-2 rounded-lg bg-gradient-to-r ${r.color}`}
                            >
                              {r.icon}
                            </div>
                            <span className="text-sm font-medium text-slate-700">
                              {r.label.split(" (")[0]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setOpenAdd(false)}
                      className="font-semibold h-11 rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={addUser}
                      disabled={
                        !addForm.name.trim() ||
                        !addForm.email.trim() ||
                        !addForm.password
                      }
                      className="font-semibold text-white h-11 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl disabled:opacity-50"
                    >
                      Create User
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Users Table Card */}
        <Card className="overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-indigo-50/30 border-slate-100">
            <CardTitle className="text-lg font-bold text-slate-800">
              All Users
              {loading && (
                <span className="ml-3 text-sm font-normal text-slate-500">
                  <Loader2 className="inline w-4 h-4 mr-1 animate-spin" />
                  Loading...
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50/50 border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                      User
                    </th>
                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                      Email
                    </th>
                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                      Role
                    </th>
                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                      Status
                    </th>
                    <th className="px-6 py-4 text-xs font-bold tracking-wider text-left uppercase text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      className="transition-colors hover:bg-slate-50/50 group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200">
                            <span className="font-semibold text-slate-700">
                              {u.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900">
                              {u.name}
                            </span>
                            {u.mustChangePassword && (
                              <div className="flex items-center gap-1 mt-1">
                                <AlertCircle className="w-3 h-3 text-amber-500" />
                                <span className="text-xs text-amber-600">
                                  First login required
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">{u.email}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1.5 h-7 w-7 hover:bg-slate-100"
                            onClick={() => copy(u.email)}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                      <td className="px-6 py-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                            <XCircle className="w-3.5 h-3.5" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(u)}
                            className="px-4 text-xs font-semibold transition-all rounded-lg h-9 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1.5" />
                            Edit
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resendInvite(u.id)}
                            disabled={sendingId === u.id}
                            className="px-4 text-xs font-semibold transition-all rounded-lg h-9 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
                          >
                            {sendingId === u.id ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            {sendingId === u.id
                              ? "Sending..."
                              : "Resend Invite"}
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-1.5 h-9 w-9 hover:bg-slate-100"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => toggleActive(u)}>
                                {u.isActive ? (
                                  <>
                                    <UserX className="w-4 h-4 mr-2" />
                                    Deactivate Account
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-4 h-4 mr-2" />
                                    Activate Account
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {tempShown?.id === u.id && (
                            <div className="px-3 py-2 ml-2 text-xs border rounded-lg border-emerald-200 bg-emerald-50">
                              <div className="font-semibold text-emerald-800">
                                Temporary Password
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="px-2 py-1 font-mono rounded text-emerald-700 bg-emerald-100">
                                  {tempShown.temp}
                                </code>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="p-1.5 h-7 w-7 hover:bg-emerald-100"
                                  onClick={() => copy(tempShown.temp)}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 rounded-full bg-slate-100">
                            <Shield className="w-8 h-8 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-600">
                              No users found
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                              {q
                                ? "Try a different search term"
                                : "Create your first user to get started"}
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

      {/* Edit User Dialog */}
      <Dialog open={openEdit} onOpenChange={(v) => !v && setOpenEdit(false)}>
        <DialogContent className="max-w-lg border-none shadow-2xl rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg shadow-md bg-gradient-to-br from-indigo-500 to-purple-600">
                <Edit className="w-5 h-5 text-white" />
              </div>
              <DialogTitle className="text-xl font-bold text-slate-800">
                Edit User
              </DialogTitle>
            </div>
          </DialogHeader>
          {editUser && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-sm font-semibold text-slate-700">
                  Full Name
                </Label>
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="h-11 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-indigo-400/20"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-semibold text-slate-700">
                  Email Address
                </Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className="h-11 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-indigo-400/20"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-semibold text-slate-700">
                  Role
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {ROLE_OPTIONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() =>
                        setEditForm({
                          ...editForm,
                          role: r.value,
                        })
                      }
                      className={`flex items-center gap-3 p-3 border rounded-xl transition-all ${
                        editForm.role === r.value
                          ? `border-indigo-500 bg-gradient-to-r ${r.color} bg-opacity-10`
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg bg-gradient-to-r ${r.color}`}
                      >
                        {r.icon}
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {r.label.split(" (")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <label className="inline-flex items-center gap-3 px-4 py-3 transition-all border border-indigo-100 cursor-pointer bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl hover:from-indigo-100 hover:to-purple-100">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-indigo-600 border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0"
                    checked={editForm.isActive}
                    onChange={(e) =>
                      setEditForm({ ...editForm, isActive: e.target.checked })
                    }
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Active account
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setOpenEdit(false)}
                  disabled={savingEdit}
                  className="font-semibold h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="font-semibold text-white h-11 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
