import type { Metadata } from "next";

export const metadata: Metadata = { title: "You're in" };

// Where Stripe drops people after paying on the marketing site. Their payment
// exists, but nothing knows their Telegram account yet — so the only job of
// this page is to push them into the bot, which does the linking.
export default function TelegramThanksPage() {
  const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";
  const link = bot ? `https://t.me/${bot.replace(/^@/, "")}` : null;

  return (
    <div className="public-shell flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">Payment received</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-text">
        One step left.
      </h1>
      <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
        Open the WaveHub bot on Telegram and send <span className="text-text">/start</span>.
        It links your account and sends your invite to the members group straight away.
      </p>

      {link ? (
        <a className="btn-pill mt-8" href={link}>
          Open the Telegram bot →
        </a>
      ) : (
        <p className="mt-8 text-sm text-neg">
          The bot link is not configured yet — contact support and we&apos;ll add you manually.
        </p>
      )}

      <p className="mt-6 text-xs text-faint">
        Use the same Telegram account you want inside the group.
      </p>
    </div>
  );
}
