import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Shield, Key, UserCheck, UserX } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  roles: AppRole[];
  companyAccess: { company_id: string; company_name: string; can_create_invoice: boolean; can_edit_invoice: boolean; can_cancel_invoice: boolean; can_export: boolean; can_view_reports: boolean }[];
}

export default function UsersManagement() {
  const { isAdmin, isSuperAdmin } = useAuth();
  const { companies } = useCompany();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("user");
  const [creating, setCreating] = useState(false);

  // Access dialog
  const [accessOpen, setAccessOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [accessCompanyId, setAccessCompanyId] = useState("");
  const [accessPerms, setAccessPerms] = useState({ can_create_invoice: true, can_edit_invoice: false, can_cancel_invoice: false, can_export: true, can_view_reports: true });

  // Reset password dialog
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, accessRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("user_roles").select("*"),
      supabase.from("user_company_access").select("*, companies(name)"),
    ]);

    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];
    const access = accessRes.data || [];

    const userList: UserProfile[] = profiles.map(p => ({
      user_id: p.user_id,
      full_name: p.full_name,
      email: p.email,
      is_active: p.is_active,
      roles: roles.filter(r => r.user_id === p.user_id).map(r => r.role),
      companyAccess: access.filter(a => a.user_id === p.user_id).map(a => ({
        company_id: a.company_id,
        company_name: (a as any).companies?.name || "",
        can_create_invoice: a.can_create_invoice,
        can_edit_invoice: a.can_edit_invoice,
        can_cancel_invoice: a.can_cancel_invoice,
        can_export: a.can_export,
        can_view_reports: a.can_view_reports,
      })),
    }));

    setUsers(userList);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  if (!isAdmin) return <p className="text-muted-foreground">Admin access required.</p>;

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) { toast({ title: "Email and password required", variant: "destructive" }); return; }
    setCreating(true);

    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "create_user", email: newEmail, password: newPassword, full_name: newName },
    });

    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    // Set role if not default
    if (newRole !== "user" && data?.user?.id) {
      await supabase.from("user_roles").update({ role: newRole }).eq("user_id", data.user.id);
    }

    toast({ title: "User created successfully" });
    setCreateOpen(false);
    setNewEmail("");
    setNewPassword("");
    setNewName("");
    setNewRole("user");
    setCreating(false);
    fetchUsers();
  };

  const handleAssignAccess = async () => {
    if (!selectedUser || !accessCompanyId) return;

    // Check if already exists
    const existing = selectedUser.companyAccess.find(a => a.company_id === accessCompanyId);
    if (existing) {
      await supabase.from("user_company_access")
        .update(accessPerms)
        .eq("user_id", selectedUser.user_id)
        .eq("company_id", accessCompanyId);
    } else {
      await supabase.from("user_company_access").insert({
        user_id: selectedUser.user_id,
        company_id: accessCompanyId,
        ...accessPerms,
      });
    }

    toast({ title: "Access updated" });
    setAccessOpen(false);
    fetchUsers();
  };

  const handleRemoveAccess = async (userId: string, companyId: string) => {
    await supabase.from("user_company_access").delete().eq("user_id", userId).eq("company_id", companyId);
    toast({ title: "Access removed" });
    fetchUsers();
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    await supabase.functions.invoke("manage-users", {
      body: { action: "toggle_active", user_id: userId, is_active: !currentActive },
    });
    toast({ title: currentActive ? "User deactivated" : "User activated" });
    fetchUsers();
  };

  const handleResetPassword = async () => {
    if (!resetUserId || !resetPassword) return;
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "reset_password", user_id: resetUserId, new_password: resetPassword },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Password reset successfully" });
    setResetOpen(false);
    setResetPassword("");
  };

  const handleChangeRole = async (userId: string, newRoleVal: AppRole) => {
    await supabase.from("user_roles").update({ role: newRoleVal }).eq("user_id", userId);
    toast({ title: "Role updated" });
    fetchUsers();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-display">User Management</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Create User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Full Name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name" /></div>
              <div><Label>Email *</Label><Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="user@example.com" /></div>
              <div><Label>Password *</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" /></div>
              <div>
                <Label>Role</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateUser} disabled={creating}>{creating ? "Creating..." : "Create User"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Company Access</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
              ) : (
                users.map(u => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.full_name || "-"}</TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Select value={u.roles[0] || "user"} onValueChange={(v) => handleChangeRole(u.user_id, v as AppRole)}>
                        <SelectTrigger className="h-8 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.companyAccess.map(ca => (
                          <Badge key={ca.company_id} variant="secondary" className="text-xs cursor-pointer" onClick={() => handleRemoveAccess(u.user_id, ca.company_id)}>
                            {ca.company_name} ✕
                          </Badge>
                        ))}
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => {
                          setSelectedUser(u);
                          setAccessCompanyId("");
                          setAccessPerms({ can_create_invoice: true, can_edit_invoice: false, can_cancel_invoice: false, can_export: true, can_view_reports: true });
                          setAccessOpen(true);
                        }}>+ Add</Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? "default" : "destructive"}>{u.is_active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Reset Password" onClick={() => { setResetUserId(u.user_id); setResetPassword(""); setResetOpen(true); }}>
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title={u.is_active ? "Deactivate" : "Activate"} onClick={() => handleToggleActive(u.user_id, u.is_active)}>
                          {u.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Company Access Dialog */}
      <Dialog open={accessOpen} onOpenChange={setAccessOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Company Access - {selectedUser?.full_name || selectedUser?.email}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Company</Label>
              <Select value={accessCompanyId} onValueChange={(v) => {
                setAccessCompanyId(v);
                // Pre-fill if existing access
                const existing = selectedUser?.companyAccess.find(a => a.company_id === v);
                if (existing) {
                  setAccessPerms({
                    can_create_invoice: existing.can_create_invoice,
                    can_edit_invoice: existing.can_edit_invoice,
                    can_cancel_invoice: existing.can_cancel_invoice,
                    can_export: existing.can_export,
                    can_view_reports: existing.can_view_reports,
                  });
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              {[
                { key: "can_create_invoice", label: "Create Invoice" },
                { key: "can_edit_invoice", label: "Edit Invoice" },
                { key: "can_cancel_invoice", label: "Cancel Invoice" },
                { key: "can_export", label: "Export Data" },
                { key: "can_view_reports", label: "View Reports" },
              ].map(perm => (
                <div key={perm.key} className="flex items-center gap-2">
                  <Checkbox
                    checked={(accessPerms as any)[perm.key]}
                    onCheckedChange={(checked) => setAccessPerms(prev => ({ ...prev, [perm.key]: !!checked }))}
                  />
                  <Label className="font-normal">{perm.label}</Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAssignAccess} disabled={!accessCompanyId}>Save Access</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <div><Label>New Password</Label><Input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="Min 6 characters" /></div>
          <DialogFooter>
            <Button onClick={handleResetPassword} disabled={resetPassword.length < 6}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
