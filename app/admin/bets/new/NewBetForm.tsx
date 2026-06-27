"use client";

import { useActionState, useRef, useState } from "react";
import { createBet, type AdminState } from "@/app/admin/actions";
import { AGGRESSIVE_RATIO } from "@/lib/staking";

const field =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary-bright focus:ring-2 focus:ring-primary/30";
const num = `${field} mono`;

function L({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

export function NewBetForm({ bankroll }: { bankroll: number }) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    createBet,
    null,
  );
  const [stake, setStake] = useState("4");
  const [notify, setNotify] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stakeNum = parseFloat(stake.replace(",", "."));
  const cons = Number.isFinite(stakeNum) ? bankroll * (stakeNum / 100) : 0;
  const aggr = cons * AGGRESSIVE_RATIO;
  const euro = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Paste a screenshot anywhere in the form (Ctrl + V) → load it into the file input.
  function onPaste(e: React.ClipboardEvent<HTMLFormElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const it of Array.from(items)) {
      if (it.type.startsWith("image/")) {
        const blob = it.getAsFile();
        if (!blob) continue;
        const file = new File([blob], `pasted-${Date.now()}.png`, {
          type: blob.type || "image/png",
        });
        const dt = new DataTransfer();
        dt.items.add(file);
        if (fileRef.current) fileRef.current.files = dt.files;
        setFileName(file.name);
        break;
      }
    }
  }

  return (
    <form action={formAction} onPaste={onPaste} className="card space-y-4 p-4">
      <L label="Tournament (type it in)">
        <input name="tournament_name" placeholder="e.g. Halle Open" className={field} />
      </L>

      <L label="The pick — write the price in here too">
        <input
          name="selection"
          required
          placeholder='e.g. "Sinner to win @1.62"'
          className={field}
        />
      </L>

      <L label="Stake % — conservative (you always enter this)">
        <input
          name="stake_pct"
          inputMode="decimal"
          required
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          placeholder="4"
          className={num}
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
            <p className="mono text-[9px] uppercase tracking-wide text-faint">
              Conservative · over €10k
            </p>
            <p className="mono mt-0.5 text-[15px] font-bold text-text">
              ≈ €{euro(cons)}
            </p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/[0.08] px-3 py-2">
            <p className="mono text-[9px] uppercase tracking-wide text-primary-bright">
              Aggressive · under €10k
            </p>
            <p className="mono mt-0.5 text-[15px] font-bold text-text">
              ≈ €{euro(aggr)}
            </p>
          </div>
        </div>
        <span className="mt-1 block text-[11px] text-faint">
          On your bankroll (€{euro(bankroll)}). Aggressive = ×5.5/4 (= 1.375×).
          Each member sees their own amount, scaled by their play style.
        </span>
      </L>

      <L label="Reasoning">
        <textarea
          name="reasoning"
          rows={4}
          placeholder="Calm, analytical. The why behind the pick."
          className={field}
        />
      </L>

      <L label="Bet slip — screenshot or PDF (optional · max 4 MB)">
        <input
          ref={fileRef}
          name="screenshot"
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:text-text"
        />
        <span className="mt-1 block text-[11px] text-faint">
          Or press Ctrl + V to paste a screenshot.
          {fileName ? ` · ${fileName}` : ""}
        </span>
      </L>

      {/* Push toggle */}
      <div className="rounded-xl border border-border bg-surface-2 p-3.5">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm font-semibold text-text">
            Push out a notification?
          </span>
          <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
            <input
              type="checkbox"
              name="notify"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="peer sr-only"
            />
            <span className="h-6 w-11 rounded-full bg-surface transition peer-checked:bg-primary" />
            <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
          </span>
        </label>

        {notify ? (
          <div className="mt-3 space-y-2">
            <input
              name="notify_title"
              maxLength={50}
              placeholder="Title (e.g. New ATP pick)"
              className={field}
            />
            <textarea
              name="notify_body"
              rows={2}
              maxLength={140}
              placeholder="Message (e.g. A fresh value pick is live. Tap to read it.)"
              className={field}
            />
          </div>
        ) : null}
      </div>

      {state?.error ? (
        <p className="rounded-lg border border-neg/30 bg-neg/10 px-3 py-2 text-xs text-neg">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-bright disabled:opacity-60"
      >
        {pending ? "Publishing…" : "Publish bet"}
      </button>
    </form>
  );
}
