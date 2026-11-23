import type { Metadata } from "next";
import { Suspense } from "react";
import SignupForm from "./form";
export const metadata: Metadata = { title: "Get Started" };
export default function Page() { return <Suspense><SignupForm /></Suspense>; }
