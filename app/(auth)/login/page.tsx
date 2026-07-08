import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Members access" };

export default function LoginPage() {
  return (
    <>
      <p className="eyebrow text-center">Members access</p>
      <h1 className="mt-5 text-center font-display text-[clamp(34px,9vw,52px)] font-bold uppercase leading-[0.95] tracking-[-0.03em]">
        Welcome back.
      </h1>
      <div className="mt-10">
        <AuthForm mode="login" />
      </div>
    </>
  );
}
