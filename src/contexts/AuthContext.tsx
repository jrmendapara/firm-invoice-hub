import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  profile: { full_name: string | null; email: string | null } | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<{ full_name: string | null; email: string | null } | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch roles/profile safely so UI never gets stuck in loading state
          setTimeout(async () => {
            try {
              const [rolesRes, profileRes] = await Promise.all([
                supabase.from("user_roles").select("role").eq("user_id", session.user.id),
                supabase.from("profiles").select("full_name, email").eq("user_id", session.user.id).maybeSingle(),
              ]);

              setRoles((rolesRes.data || []).map((r) => r.role));
              setProfile(profileRes.data ?? null);
            } catch (err) {
              console.error("AuthContext profile/role fetch failed", err);
              setRoles([]);
              setProfile(null);
            } finally {
              setLoading(false);
            }
          }, 0);
        } else {
          setRoles([]);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const isSuperAdmin = roles.includes("super_admin");

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, isAdmin, isSuperAdmin, profile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
