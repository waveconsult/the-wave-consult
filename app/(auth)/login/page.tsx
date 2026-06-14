import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-1 font-display text-xl font-semibold text-text">
        Welcome back
      </h1>
      <p className="mb-5 text-sm text-muted">Log in to your consult.</p>
      <AuthForm mode="login" />
    </>
  );
}
