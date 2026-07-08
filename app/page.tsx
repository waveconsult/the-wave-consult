import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { PreLogin } from "@/components/PreLogin";

// Entry point. Logged-in users go to the feed; logged-out visitors see the
// minimal apply-first pre-login screen (after the intro animation).
export default async function Home() {
  const profile = await getProfile();
  if (profile) redirect("/bets");
  return <PreLogin />;
}
