"use client";

import { useState, type FormEvent } from "react";
import { api, errorMessage, fieldErrorsOf } from "@/lib/client";
import { useAuth } from "@/lib/auth-context";
import { btnPrimary } from "@/lib/styles";
import type { User } from "@/lib/types";
import Field from "./Field";

type Msg = { type: "ok" | "error"; text: string } | null;

function Message({ msg }: { msg: Msg }) {
  return (
    <div aria-live="polite" className="min-h-5 text-sm">
      {msg?.type === "ok" && <p className="font-medium text-green-800">{msg.text}</p>}
      {msg?.type === "error" && <p role="alert" className="font-medium text-red-700">{msg.text}</p>}
    </div>
  );
}

export default function ProfilePanel() {
  const { user, setUser } = useAuth();
  const [nameMsg, setNameMsg] = useState<Msg>(null);
  const [nameErrors, setNameErrors] = useState<Record<string, string>>({});
  const [pwMsg, setPwMsg] = useState<Msg>(null);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"name" | "pw" | null>(null);

  async function saveName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "");
    setBusy("name"); setNameMsg(null); setNameErrors({});
    try {
      const d = await api<{ user: User }>("/api/auth/me", { method: "PATCH", body: JSON.stringify({ name }) });
      setUser(d.user);
      setNameMsg({ type: "ok", text: "Profile updated." });
    } catch (err) {
      setNameErrors(fieldErrorsOf(err));
      setNameMsg({ type: "error", text: errorMessage(err) });
    } finally { setBusy(null); }
  }

  async function savePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const currentPassword = String(f.get("currentPassword") ?? "");
    const newPassword = String(f.get("newPassword") ?? "");
    setPwMsg(null); setPwErrors({});
    if (newPassword !== String(f.get("confirm") ?? "")) {
      setPwErrors({ confirm: "Passwords don't match" });
      return setPwMsg({ type: "error", text: "Please make sure both new passwords match." });
    }
    setBusy("pw");
    try {
      await api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      form.reset();
      setPwMsg({ type: "ok", text: "Password changed." });
    } catch (err) {
      setPwErrors(fieldErrorsOf(err));
      setPwMsg({ type: "error", text: errorMessage(err) });
    } finally { setBusy(null); }
  }

  return (
    <section aria-labelledby="profile-heading" className="max-w-xl space-y-12">
      <div>
        <h2 id="profile-heading" className="text-xl font-bold">Profile</h2>
        <form onSubmit={saveName} className="mt-4 space-y-4" noValidate>
          <Field label="Full name" name="name" autoComplete="name" required defaultValue={user?.name} error={nameErrors.name} />
          <Field label="Email" name="email" type="email" value={user?.email ?? ""} readOnly hint="Your email is used to sign in and can't be changed here." />
          <button type="submit" disabled={busy === "name"} className={btnPrimary}>{busy === "name" ? "Saving…" : "Save changes"}</button>
          <Message msg={nameMsg} />
        </form>
      </div>

      <div>
        <h2 className="text-xl font-bold">Change password</h2>
        <form onSubmit={savePassword} className="mt-4 space-y-4" noValidate>
          <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" required error={pwErrors.currentPassword} />
          <Field label="New password" name="newPassword" type="password" autoComplete="new-password" required hint="At least 8 characters, with a letter and a number." error={pwErrors.newPassword} />
          <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required error={pwErrors.confirm} />
          <button type="submit" disabled={busy === "pw"} className={btnPrimary}>{busy === "pw" ? "Updating…" : "Update password"}</button>
          <Message msg={pwMsg} />
        </form>
      </div>
    </section>
  );
}
