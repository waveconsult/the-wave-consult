import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-1 font-display text-xl font-semibold text-text">
        Create your account
      </h1>
      <p className="mb-5 text-sm text-muted">
        Access starts with a free account. Plan access is granted by
        application — no checkout.
      </p>
      <AuthForm mode="signup" />
    </>
  );
}
