"use client";

import { useState, type FormEvent } from "react";
import { api } from "../../shared/api/client";
import { useAuth } from "../../shared/context/useAuth";
import { useNavigate } from "../../shared/router";

const input = "mt-1 h-11 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-black";
const card = "rounded-xl border border-gray-200 bg-white p-6";

const Security = () => {
  const { token, user, updateSession, logout } = useAuth();
  const navigate = useNavigate();
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [sessionMessage, setSessionMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [busy, setBusy] = useState(false);

  const changePassword = (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (passwords.next !== passwords.confirm) {
      setPasswordMessage({ ok: false, text: "The new passwords do not match." });
      return;
    }
    setBusy(true);
    setPasswordMessage(null);
    api.changePassword(token, passwords.current, passwords.next)
      .then((response) => {
        updateSession({ token: response.token }); // this device stays logged in
        setPasswords({ current: "", next: "", confirm: "" });
        setPasswordMessage({ ok: true, text: response.message });
      })
      .catch((requestError: Error) => setPasswordMessage({ ok: false, text: requestError.message }))
      .finally(() => setBusy(false));
  };

  const logoutEverywhere = () => {
    if (!token || !window.confirm("Log out of every other phone and computer?")) return;
    api.logoutEverywhere(token)
      .then((response) => {
        updateSession({ token: response.token });
        setSessionMessage({ ok: true, text: response.message });
      })
      .catch((requestError: Error) => setSessionMessage({ ok: false, text: requestError.message }));
  };

  const deleteAccount = (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (!window.confirm("Delete your account permanently? This cannot be undone.")) return;
    setDeleteError("");
    api.deleteAccount(token, deletePassword)
      .then(async () => {
        await logout();
        navigate("/");
      })
      .catch((requestError: Error) => setDeleteError(requestError.message));
  };

  return (
    <div className="space-y-6">
      <form onSubmit={changePassword} className={card}>
        <h2 className="text-lg font-semibold">Change password</h2>
        <div className="mt-5 grid gap-4 sm:max-w-md">
          <label className="text-sm font-medium">Current password<input required type="password" autoComplete="current-password" value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} className={input} /></label>
          <label className="text-sm font-medium">New password<input required type="password" autoComplete="new-password" placeholder="8+ characters, letters and numbers" value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} className={input} /></label>
          <label className="text-sm font-medium">Confirm new password<input required type="password" autoComplete="new-password" value={passwords.confirm} onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })} className={input} /></label>
        </div>
        {passwordMessage && <p className={`mt-4 text-sm ${passwordMessage.ok ? "text-green-700" : "text-red-600"}`} role={passwordMessage.ok ? "status" : "alert"}>{passwordMessage.text}</p>}
        <button type="submit" disabled={busy} className="mt-5 rounded-md bg-black px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60">{busy ? "Updating..." : "Change password"}</button>
        <p className="mt-3 text-xs text-gray-500">Changing your password also logs you out of your other devices.</p>
      </form>

      <section className={card}>
        <h2 className="text-lg font-semibold">Devices</h2>
        <p className="mt-1 text-sm text-gray-600">Used a shared or public computer? End every other login with one tap. You stay logged in here.</p>
        <button type="button" onClick={logoutEverywhere} className="mt-4 rounded-md border border-black px-5 py-2 text-sm font-medium">Log out of all other devices</button>
        {sessionMessage && <p className={`mt-3 text-sm ${sessionMessage.ok ? "text-green-700" : "text-red-600"}`} role="status">{sessionMessage.text}</p>}
      </section>

      {user?.role !== "admin" && (
        <form onSubmit={deleteAccount} className="rounded-xl border border-red-200 bg-red-50/40 p-6">
          <h2 className="text-lg font-semibold text-red-800">Delete account</h2>
          <p className="mt-1 text-sm text-gray-700">Your profile, saved addresses, wishlist and reviews are deleted. Past orders stay in the store&apos;s records for accounting, but are no longer linked to you.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <input required type="password" placeholder="Enter your password to confirm" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} className="h-11 w-72 rounded-md border border-red-200 bg-white px-3 text-sm outline-none focus:border-red-600" aria-label="Password" />
            <button type="submit" className="rounded-md bg-red-700 px-5 py-2 text-sm font-medium text-white">Delete my account</button>
          </div>
          {deleteError && <p className="mt-3 text-sm text-red-700" role="alert">{deleteError}</p>}
        </form>
      )}
    </div>
  );
};

export default Security;
