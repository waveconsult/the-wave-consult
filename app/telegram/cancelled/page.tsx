import type { Metadata } from "next";

export const metadata: Metadata = { title: "Checkout cancelled" };

// Stripe sends people here if they back out of the bot's checkout.
export default function TelegramCancelledPage() {
  const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";
  const link = bot ? `https://t.me/${bot.replace(/^@/, "")}` : null;

  return (
    <div className="public-shell flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">Nothing charged</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-text">
        Checkout cancelled.
      </h1>
      <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
        No payment was taken. Go back to the bot whenever you want to pick a
        membership again.
      </p>
      {link ? (
        <a className="btn-pill mt-8" href={link}>
          Back to the bot →
        </a>
      ) : null}
    </div>
  );
}
