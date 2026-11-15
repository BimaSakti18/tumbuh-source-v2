import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk — WARAS" },
      { name: "description", content: "Masuk atau daftar untuk mulai melacak kebiasaanmu." },
      { property: "og:title", content: "Masuk — WARAS" },
      { property: "og:description", content: "Masuk atau daftar untuk mulai melacak kebiasaanmu." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const goHome = useCallback(async (userId: string) => {
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    navigate({ to: isAdmin ? "/admin" : "/dashboard" });
  }, [navigate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goHome(data.session.user.id);
    });
  }, [goHome]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) setMsg(error.message);
      else setMsg("Jika email terdaftar, tautan untuk membuat kata sandi baru sudah dikirim 💌");
    } else if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/dashboard", data: { display_name: name } },
      });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg("Cek email kamu untuk konfirmasi akun 💌");
      else navigate({ to: "/dashboard" });
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.code === "email_not_confirmed" ? "Konfirmasi email kamu dulu lewat tautan di inbox 💌" : "Email atau kata sandi salah.");
      else await goHome(data.user.id);
    }
    setBusy(false);
  }

  const input = "w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring";
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl bg-card p-8 shadow-soft">
        <Link to="/" className="font-display text-xl font-bold text-primary">WARAS</Link>
        <h1 className="mt-6 text-3xl font-bold">
          {mode === "in" ? "Selamat datang kembali" : mode === "up" ? "Buat akun" : "Atur kata sandi baru"}
        </h1>
        {mode === "reset" && (
          <p className="mt-2 text-sm text-muted-foreground">
            Masukkan email akunmu. Kami akan mengirim tautan untuk memverifikasi email dan membuat kata sandi baru.
          </p>
        )}
        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "up" && (
            <input className={input} placeholder="Nama tampilan" value={name} onChange={(e) => setName(e.target.value)} required />
          )}
          <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {mode !== "reset" && (
            <input className={input} type="password" placeholder="Kata sandi" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
          )}
          <button disabled={busy} className="w-full rounded-full bg-primary py-3 font-medium text-primary-foreground disabled:opacity-60">
            {busy ? "..." : mode === "in" ? "Masuk" : mode === "up" ? "Daftar" : "Kirim tautan"}
          </button>
        </form>
        {msg && <p className="mt-4 text-sm text-muted-foreground">{msg}</p>}
        {mode === "in" && (
          <button onClick={() => { setMode("reset"); setMsg(null); }} className="mt-4 block text-sm text-muted-foreground underline">
            Lupa kata sandi? / Pengguna lama, atur kata sandi baru
          </button>
        )}
        <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }} className="mt-4 block text-sm text-primary underline">
          {mode === "in" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
        </button>
      </div>
    </main>
  );
}
