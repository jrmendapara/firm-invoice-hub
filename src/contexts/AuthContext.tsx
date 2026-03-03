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

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = 5000): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Request timed out")), timeoutMs);
      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  };

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
                withTimeout(
                  supabase.from("user_roles").select("role").eq("user_id", session.user.id),
                  4000
                ),
                withTimeout(
                  supabase.from("profiles").select("full_name, email").eq("user_id", session.user.id).maybeSingle(),
                  4000
                ),
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

    // Fallback: if onAuthStateChange hasn't fired within 5s, stop loading
    const fallbackTimer = setTimeout(() => {
      setLoading((prev) => {
        if (prev) console.warn("Auth fallback: forcing loading=false");
        return false;
      });
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
    };
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
