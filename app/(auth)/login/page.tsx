import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./form";
export const metadata: Metadata = { title: "Log In" };
export default function Page() { return <Suspense><LoginForm /></Suspense>; }
