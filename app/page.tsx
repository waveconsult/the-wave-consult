import { redirect } from "next/navigation";

// Entry point. Authed users land on the Bets feed; proxy.ts bounces
// unauthenticated visitors to /login.
export default function Home() {
  redirect("/bets");
}
