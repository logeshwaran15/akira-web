import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";

export type AcademicYear = { academicYearKey: string; yearName: string; status: string };

const STORAGE_KEY = "akira_academic_year";
const ACADEMIC_YEARS_QUERY_KEY = ["academicYears"] as const;

function hasToken() {
  return typeof window !== "undefined" && !!localStorage.getItem("akira_token");
}

type AcademicYearContextValue = {
  years: AcademicYear[];
  loading: boolean;
  selectedYearKey: string;
  setSelectedYearKey: (key: string) => void;
  selectedYear: AcademicYear | null;
};

const AcademicYearContext = createContext<AcademicYearContextValue | null>(null);

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const enabled = hasToken() && !!user && !user.isPlatformTenant;

  const query = useQuery({
    queryKey: ACADEMIC_YEARS_QUERY_KEY,
    queryFn: () => apiFetch("/api/AcademicYear") as Promise<AcademicYear[]>,
    enabled,
    staleTime: 60_000,
    retry: false,
  });

  const years = useMemo(() => query.data ?? [], [query.data]);

  const [selectedYearKey, setSelectedYearKeyState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(STORAGE_KEY) ?? "";
  });

  // Once years load: keep a stored choice only if it's still a real year for
  // this tenant, otherwise fall back to whichever year is marked Active.
  useEffect(() => {
    if (years.length === 0) return;
    const stillValid = years.some((y) => y.academicYearKey === selectedYearKey);
    if (stillValid) return;
    const active = years.find((y) => y.status === "Active") ?? years[0];
    if (active) setSelectedYearKeyState(active.academicYearKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [years]);

  const setSelectedYearKey = (key: string) => {
    setSelectedYearKeyState(key);
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      /* ignore quota errors */
    }
  };

  const selectedYear = years.find((y) => y.academicYearKey === selectedYearKey) ?? null;

  return (
    <AcademicYearContext.Provider
      value={{ years, loading: query.isLoading, selectedYearKey, setSelectedYearKey, selectedYear }}
    >
      {children}
    </AcademicYearContext.Provider>
  );
}

/**
 * The single, shared "which Academic Year am I looking at" selection, used
 * across every page instead of each page fetching its own /api/AcademicYear
 * list and keeping its own local dropdown. Selection persists across page
 * navigation and reloads (localStorage) and defaults to whichever year is
 * marked Active for the tenant.
 */
export function useAcademicYear() {
  const ctx = useContext(AcademicYearContext);
  if (!ctx) {
    throw new Error("useAcademicYear must be used within an AcademicYearProvider");
  }
  return ctx;
}
