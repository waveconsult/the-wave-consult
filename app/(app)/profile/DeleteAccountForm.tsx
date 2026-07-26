"use client";

import { useActionState, useState } from "react";
import { deleteAccount, type DeleteState } from "./actions";

// Deliberately two-step: the destructive form is hidden until asked for, and
// then the member must type their own email address. Account deletion is
// irreversible and cancels a paid subscription along the way, so a single
// mis-tap must never be enough.
export function DeleteAccountForm({
  email,
  hasSubscription,
}: {
  email: string | null;
  hasSubscription: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<DeleteState, FormData>(
    deleteAccount,
    { status: "idle" },
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] font-semibold text-neg"
      >
        Delete account
      </button>
    );
  }

  return (
    <form action={formAction} className="w-full">
      <p className="text-[13px] leading-relaxed text-muted">
        This permanently deletes your account and everything on it. It cannot be
        undone.
        {hasSubscription && (
          <>
            {" "}
            <span className="text-text">
              Your membership will be cancelled immediately and will not renew.
            </span>{" "}
            You will not be refunded for the rest of the current term.
          </>
        )}
      </p>

      <label
        htmlFor="confirm_email"
        className="mt-3 block text-[11px] font-semibold uppercase tracking-wider text-faint"
      >
        Type {email ?? "your email"} to confirm
      </label>
      <input
        id="confirm_email"
        name="confirm_email"
        type="email"
        autoComplete="off"
        placeholder={email ?? "you@example.com"}
        className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-text placeholder:text-faint"
      />

      {state.status === "error" && (
        <p className="mt-2 text-xs leading-relaxed text-neg">{state.message}</p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-xl border border-border-strong py-2.5 text-sm font-semibold text-text"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl border border-neg/40 bg-neg/10 py-2.5 text-sm font-semibold text-neg disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Delete forever"}
        </button>
      </div>
    </form>
  );
}
