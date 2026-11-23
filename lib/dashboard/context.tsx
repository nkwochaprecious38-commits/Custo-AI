"use client";
import { createContext, useContext } from "react";

export type Role = "org_admin" | "store_manager" | "ecommerce_manager" | "marketing_manager" | "analyst" | "team_member";
export const ROLE_LABELS: Record<Role, string> = {
  org_admin: "Organization Admin", store_manager: "Store Manager", ecommerce_manager: "E-commerce Manager",
  marketing_manager: "Marketing Manager", analyst: "Analyst", team_member: "Team Member",
};
export type Ctx = { userId: string; email: string; fullName: string; orgId: string | null; orgName: string; role: Role; dbReady: boolean };
const C = createContext<Ctx | null>(null);
export const OrgProvider = C.Provider;
export function useOrg() { const v = useContext(C); if (!v) throw new Error("OrgProvider missing"); return v; }
export const canWriteRole = (r: Role) => ["org_admin", "store_manager", "ecommerce_manager", "marketing_manager"].includes(r);
