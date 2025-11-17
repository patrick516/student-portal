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

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "teacher" | "bursar" | "viewer";
  isActive: boolean;
  mustChangePassword?: boolean;
};

const ROLE_OPTIONS: Array<{ value: UserRow["role"]; label: string }> = [
  { value: "admin", label: "Head Teacher (Admin)" },
  { value: "teacher", label: "Teacher" },
  { value: "bursar", label: "Bursar" },
  { value: "viewer", label: "Viewer (Read-only)" },
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by name, email, role..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-72"
          />
          {/* ADD USER */}
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button>Add User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add User</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Name</Label>
                  <Input
                    value={addForm.name}
                    onChange={(e) =>
                      setAddForm({ ...addForm, name: e.target.value })
                    }
                    placeholder="Full name"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={addForm.email}
                    onChange={(e) =>
                      setAddForm({ ...addForm, email: e.target.value })
                    }
                    placeholder="user@school.org"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Temporary Password</Label>
                  <Input
                    type="password"
                    value={addForm.password}
                    onChange={(e) =>
                      setAddForm({ ...addForm, password: e.target.value })
                    }
                    placeholder="Temp password"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Role</Label>
                  <select
                    className="h-10 rounded-md bg-[hsl(var(--input))] px-3 text-sm border border-[hsl(var(--border))]"
                    value={addForm.role}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        role: e.target.value as UserRow["role"],
                      })
                    }
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="outline" onClick={() => setOpenAdd(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={addUser}
                    disabled={
                      !addForm.name.trim() ||
                      !addForm.email.trim() ||
                      !addForm.password
                    }
                  >
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Users{" "}
            {loading && (
              <span className="text-sm text-[hsl(var(--muted-foreground))] ml-2">
                Loading…
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b last:border-none">
                    <td className="py-2 pr-3">{u.name}</td>
                    <td className="py-2 pr-3">
                      {u.email}
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2 ml-2 text-xs h-7"
                        onClick={() => copy(u.email)}
                      >
                        Copy
                      </Button>
                    </td>
                    <td className="py-2 pr-3">
                      {ROLE_OPTIONS.find((r) => r.value === u.role)?.label ||
                        u.role}
                    </td>
                    <td className="py-2 pr-3">
                      {u.isActive ? (
                        <span className="text-[hsl(var(--secondary))]">
                          Active
                        </span>
                      ) : (
                        <span className="text-[hsl(var(--muted-foreground))]">
                          Inactive
                        </span>
                      )}
                      {u.mustChangePassword && (
                        <span className="ml-2 text-xs text-[hsl(var(--accent))]">
                          first login
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(u)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resendInvite(u.id)}
                          disabled={sendingId === u.id}
                        >
                          {sendingId === u.id ? "Sending…" : "Resend Invite"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(u)}
                        >
                          {u.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        {tempShown?.id === u.id && (
                          <span className="px-2 py-1 text-xs border rounded">
                            Temp: <b>{tempShown.temp}</b>{" "}
                            <Button
                              variant="outline"
                              size="sm"
                              className="ml-1 h-6 px-2 text-[10px]"
                              onClick={() => copy(tempShown.temp)}
                            >
                              Copy
                            </Button>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-[hsl(var(--muted-foreground))]"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit user dialog */}
      <Dialog open={openEdit} onOpenChange={(v) => !v && setOpenEdit(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Role</Label>
                <select
                  className="h-10 rounded-md bg-[hsl(var(--input))] px-3 text-sm border border-[hsl(var(--border))]"
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      role: e.target.value as UserRow["role"],
                    })
                  }
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) =>
                      setEditForm({ ...editForm, isActive: e.target.checked })
                    }
                  />
                  Active account
                </label>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={() => setOpenEdit(false)}
                  disabled={savingEdit}
                >
                  Cancel
                </Button>
                <Button onClick={saveEdit} disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
