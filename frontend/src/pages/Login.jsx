import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button, Field, inputCls } from "../components/ui.jsx";
import { useAuth } from "../components/Auth.jsx";

export default function Login() {
  const { admin, loading, login } = useAuth();
  const nav = useNavigate();
  const from = useLocation().state?.from || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  if (!loading && admin) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      nav(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xl font-semibold text-emerald-800">Maa Rent a Car</p>
          <p className="text-sm text-slate-500">পরিবহন হিসাব · Admin sign in</p>
        </div>
        <Field label="Email">
          <input type="email" required autoFocus autoComplete="username" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <div className="relative">
            <input type={show ? "text" : "password"} required autoComplete="current-password" className={`${inputCls} pr-16`} value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-3 text-sm text-slate-500 hover:text-slate-700">
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}