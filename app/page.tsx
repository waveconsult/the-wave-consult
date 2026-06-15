import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { Funnel } from "@/components/funnel/Funnel";

// Entry point. Logged-in users go to the feed; logged-out visitors see the
// public quiz funnel (after the intro animation).
export default async function Home() {
  const profile = await getProfile();
  if (profile) redirect("/bets");
  return <Funnel />;
}
