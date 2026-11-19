
import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, Button, Field, inputCls } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";
import { useAuth } from "../components/Auth.jsx";

const blank = { name: "", email: "", password: "" };

export default function Admins() {
  const { admin: me } = useAuth();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [f, setF] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);

  const [resetAdmin, setResetAdmin] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const set = (k) => (e) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const load = useCallback(
    () => api.get("/admins").then(setRows).catch((e) => toast(e.message, "err")),
    [toast]
  );

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.post("/admins", f);
      toast("Admin added");
      setF(blank);
      setShowNewAdminPassword(false);
      load();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (a) => {
    try {
      await api.patch(`/admins/${a.id}/active`, {
        isActive: !a.isActive,
      });
      load();
    } catch (err) {
      toast(err.message, "err");
    }
  };

  const openReset = (a) => {
    setResetAdmin(a);
    setNewPassword("");
    setConfirmPassword("");
  };

  const closeReset = () => {
    setResetAdmin(null);
    setNewPassword("");
    setConfirmPassword("");
  };

  const reset = async (e) => {
    e.preventDefault();

    if (!resetAdmin) return;

    if (newPassword.length < 8) {
      return toast("Password must be at least 8 characters", "err");
    }

    if (newPassword !== confirmPassword) {
      return toast("The two passwords are not the same", "err");
    }

    setResetting(true);

    try {
      await api.post(`/admins/${resetAdmin.id}/password`, {
        password: newPassword,
      });

      toast("Password changed. That admin is signed out everywhere.");
      closeReset();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 sm:space-y-8">

      {/* Page heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>Settings</span>
            <span>/</span>
            <span className="text-slate-600">Administrators</span>
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Admin management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage administrator accounts and access to your system.
          </p>
        </div>

        {/* Total admins */}
        <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
              <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" />
              <circle cx="10" cy="7" r="4" />
              <path d="M20 8v6m3-3h-6" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <p className="text-xl font-bold leading-none text-slate-900">
              {rows.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">Total admins</p>
          </div>
        </div>
      </div>

      {/* Admin list */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-semibold text-slate-900">
              Administrator accounts
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              View and manage access for each administrator.
            </p>
          </div>

          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {rows.length} accounts
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" strokeLinecap="round" />
              </svg>
            </div>
            <p className="mt-3 font-medium text-slate-700">
              No administrators found
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Add an administrator using the form below.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold uppercase text-blue-700">
                    {a.name?.trim()?.charAt(0) || "A"}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-slate-900">
                        {a.name}
                      </p>

                      {a.id === me?.id && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          YOU
                        </span>
                      )}

                      <Badge tone={a.isActive ? "green" : "slate"}>
                        {a.isActive ? "active" : "inactive"}
                      </Badge>
                    </div>

                    <p className="mt-1 break-all text-sm text-slate-500">
                      {a.email}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {a.lastLoginAt
                        ? `Last sign-in: ${new Date(a.lastLoginAt).toLocaleString()}`
                        : "Never signed in"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:shrink-0">
                  <Button
                    type="button"
                    onClick={() => openReset(a)}
                  >
                    Reset password
                  </Button>

                  {a.id !== me?.id && (
                    <Button
                      type="button"
                      onClick={() => toggle(a)}
                    >
                      {a.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reset password form - hidden until Reset password is clicked */}
      {resetAdmin !== null && (
        <section className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-blue-100 bg-blue-50/60 px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
                  <circle cx="12" cy="15" r="1" />
                </svg>
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Reset password
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Change the password for {resetAdmin.name}.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={closeReset}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
              aria-label="Close password reset form"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
                <path d="m18 6-12 12M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <form onSubmit={reset} className="space-y-4 p-4 sm:p-5">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Selected administrator
              </p>
              <p className="mt-1 font-medium text-slate-800">
                {resetAdmin.name}
              </p>
              <p className="text-sm text-slate-500">
                {resetAdmin.email}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="New password *" hint="At least 8 characters">
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={inputCls}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </Field>

              <Field label="Confirm new password *">
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={inputCls}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </Field>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" onClick={closeReset}>
                Cancel
              </Button>

              <Button type="submit" disabled={resetting}>
                {resetting ? "Updating..." : "Update password"}
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* Add administrator */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
                <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" />
                <circle cx="10" cy="7" r="4" />
                <path d="M20 8v6m3-3h-6" strokeLinecap="round" />
              </svg>
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Add an administrator
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Create a new account with full system access.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={add} className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Full name *">
              <input
                required
                className={inputCls}
                placeholder="Enter full name"
                value={f.name}
                onChange={set("name")}
              />
            </Field>

            <Field label="Email address *">
              <input
                type="email"
                required
                className={inputCls}
                placeholder="admin@example.com"
                value={f.email}
                onChange={set("email")}
              />
            </Field>

            <Field label="Password *" hint="At least 8 characters">
              <div className="relative">
                <input
                  type={showNewAdminPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={`${inputCls} pr-16`}
                  placeholder="Create a password"
                  value={f.password}
                  onChange={set("password")}
                />

                <button
                  type="button"
                  onClick={() => setShowNewAdminPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-500 transition hover:text-blue-600"
                  aria-label={showNewAdminPassword ? "Hide password" : "Show password"}
                >
                  {showNewAdminPassword ? "Hide" : "Show"}
                </button>
              </div>
            </Field>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Add administrator"}
            </Button>
          </div>
        </form>
      </section>

      <p className="text-center text-xs leading-relaxed text-slate-400">
        Administrator accounts have access to the entire system. Only create
        accounts for trusted people.
      </p>
    </div>
  );
}
