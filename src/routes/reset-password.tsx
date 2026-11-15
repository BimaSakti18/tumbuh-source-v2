import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Kata Sandi Baru — Tumbuh" },
      { name: "description", content: "Buat kata sandi baru untuk akun Tumbuh kamu." },
      { property: "og:title", content: "Kata Sandi Baru — Tumbuh" },
      { property: "og:description", content: "Buat kata sandi baru untuk akun Tumbuh kamu." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setMsg("Kata sandi tidak sama.");
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setMsg(error.message);
    else navigate({ to: "/dashboard" });
  }

  const input = "w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring";
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl bg-card p-8 shadow-soft">
        <Link to="/" className="font-display text-xl font-bold text-primary">🌿 Tumbuh</Link>
        <h1 className="mt-6 text-3xl font-bold">Kata sandi baru</h1>
        {ready ? (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <input className={input} type="password" placeholder="Kata sandi baru" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <input className={input} type="password" placeholder="Ulangi kata sandi" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            <button disabled={busy} className="w-full rounded-full bg-primary py-3 font-medium text-primary-foreground disabled:opacity-60">
              {busy ? "..." : "Simpan & masuk"}
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Buka halaman ini dari tautan di email kamu. Belum dapat?{" "}
            <Link to="/auth" className="text-primary underline">Kirim ulang</Link>
          </p>
        )}
        {msg && <p className="mt-4 text-sm text-muted-foreground">{msg}</p>}
      </div>
    </main>
  );
}
