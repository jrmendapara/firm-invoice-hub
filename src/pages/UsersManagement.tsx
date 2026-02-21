import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UsersManagement() {
  const { isAdmin } = useAuth();

  if (!isAdmin) return <p className="text-muted-foreground">Admin access required.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-display">User Management</h1>
      <Card>
        <CardHeader><CardTitle>Users</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">User management with company access assignment coming soon. Admins will be able to create users, assign them to companies, and set granular permissions.</p>
        </CardContent>
      </Card>
    </div>
  );
}
