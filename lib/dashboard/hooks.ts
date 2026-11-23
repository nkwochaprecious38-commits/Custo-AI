"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useOrg } from "./context";

// Segment names for audience pickers: "All shoppers" plus the organization's own segments.
export function useSegmentOptions(): string[] {
  const { orgId, dbReady } = useOrg();
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    if (!orgId || !dbReady) return;
    supabaseBrowser().from("segments").select("name").eq("org_id", orgId).order("name").then(({ data }: any) => setNames((data || []).map((r: any) => r.name)));
  }, [orgId, dbReady]);
  return ["All shoppers", ...names];
}
