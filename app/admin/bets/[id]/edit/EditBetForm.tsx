"use client";

import { useActionState, useRef, useState } from "react";
import { updateBet, type AdminState } from "@/app/admin/actions";
import { AGGRESSIVE_RATIO } from "@/lib/staking";
import type { BetWithMeta } from "@/lib/types";

const field =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary-bright focus:ring-2 focus:ring-primary/30";
const num = `${field} mono`;

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

// Same shape as NewBetForm so editing feels like posting, with two differences:
// every field starts filled in, and the attachment is left alone unless you
// actually pick a new one. There is no push toggle — a notification announces a
// new pick, and firing one again because a typo was fixed would train members
// to ignore them.
export function EditBetForm({ bet }: { bet: BetWithMeta }) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    updateBet,
    null,
  );
  const [stake, setStake] = useState(String(bet.stake_pct ?? ""));
  const [fileName, setFileName] = useState<string | null>(null);
  const [removeShot, setRemoveShot] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Bankroll is only used for the live stake preview, so a sensible constant is
  // enough here — the member's own amount is computed per member at read time.
  const bankroll = 10000;

  const stakeNum = parseFloat(stake.replace(",", "."));
  const cons = Number.isFinite(stakeNum) ? bankroll * (stakeNum / 100) : 0;
  const aggr = cons * AGGRESSIVE_RATIO;
  const euro = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
        setRemoveShot(false);
        break;
      }
    }
  }

  return (
    <form action={formAction} onPaste={onPaste} className="card space-y-4 p-4">
      <input type="hidden" name="id" value={bet.id} />

      <L label="Tournament">
        <input
          name="tournament_name"
          defaultValue={bet.tournament_name ?? ""}
          placeholder="e.g. Halle Open"
          className={field}
        />
      </L>

      <L label="The pick — write the price in here too">
        <input
          name="selection"
          required
          defaultValue={bet.selection}
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
          className={num}
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
            <p className="mono text-[9px] uppercase tracking-wide text-faint">
              Conservative · per €10k
            </p>
            <p className="mono mt-0.5 text-[15px] font-bold text-text">
              ≈ €{euro(cons)}
            </p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/[0.08] px-3 py-2">
            <p className="mono text-[9px] uppercase tracking-wide text-primary-bright">
              Aggressive · per €10k
            </p>
            <p className="mono mt-0.5 text-[15px] font-bold text-text">
              ≈ €{euro(aggr)}
            </p>
          </div>
        </div>
      </L>

      <L label="Reasoning">
        <textarea
          name="reasoning"
          rows={4}
          defaultValue={bet.reasoning ?? ""}
          className={field}
        />
      </L>

      <L label="Bet slip — replace it (optional · max 4 MB)">
        <input
          ref={fileRef}
          name="screenshot"
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => {
            setFileName(e.target.files?.[0]?.name ?? null);
            if (e.target.files?.length) setRemoveShot(false);
          }}
          className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:text-text"
        />
        <span className="mt-1 block text-[11px] text-faint">
          {bet.screenshot_path
            ? "Leave empty to keep the current one. Ctrl + V pastes a screenshot."
            : "No bet slip attached yet. Ctrl + V pastes a screenshot."}
          {fileName ? ` · ${fileName}` : ""}
        </span>
      </L>

      {bet.screenshot_path ? (
        <>
          {/* Current attachment, so it is obvious what "keep" means. */}
          <div className="overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bet.screenshot_url ?? ""}
              alt="Current bet slip"
              className="block max-h-56 w-full object-contain bg-surface-2"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-muted">
            <input
              type="checkbox"
              name="remove_screenshot"
              checked={removeShot}
              onChange={(e) => setRemoveShot(e.target.checked)}
              className="h-4 w-4 accent-[#cdd2d8]"
            />
            Remove the current bet slip
          </label>
        </>
      ) : null}

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
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
