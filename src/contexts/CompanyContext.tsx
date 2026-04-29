import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { Database } from "@/integrations/supabase/types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

interface CompanyContextType {
  companies: Company[];
  selectedCompany: Company | null;
  setSelectedCompanyId: (id: string) => void;
  loading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const STORAGE_PREFIX = "gst-ledger:selectedCompanyId:";
const storageKey = (userId?: string | null) => (userId ? `${STORAGE_PREFIX}${userId}` : null);

const readStoredCompanyId = (userId?: string | null): string | null => {
  const key = storageKey(userId);
  if (!key || typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStoredCompanyId = (userId: string | null | undefined, id: string | null) => {
  const key = storageKey(userId);
  if (!key || typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(key, id);
    else window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, _setSelectedCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setSelectedCompanyId = useCallback(
    (id: string) => {
      _setSelectedCompanyId(id);
      writeStoredCompanyId(user?.id, id);
    },
    [user?.id],
  );

  useEffect(() => {
    if (!user) {
      setCompanies([]);
      _setSelectedCompanyId(null);
      setLoading(false);
      return;
    }

    const fetchCompanies = async () => {
      const { data } = await supabase
        .from("companies")
        .select("*")
        .eq("is_active", true)
        .order("name");

      const list = data || [];
      setCompanies(list);

      if (list.length > 0) {
        const stored = readStoredCompanyId(user.id);
        const validStored = stored && list.some((c) => c.id === stored) ? stored : null;
        const next = validStored || list[0].id;
        _setSelectedCompanyId(next);
        if (next !== stored) writeStoredCompanyId(user.id, next);
      } else {
        _setSelectedCompanyId(null);
        writeStoredCompanyId(user.id, null);
      }
      setLoading(false);
    };

    fetchCompanies();
  }, [user]);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId) || null;

  return (
    <CompanyContext.Provider value={{ companies, selectedCompany, setSelectedCompanyId, loading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
