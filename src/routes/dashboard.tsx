import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Kebiasaanku — Tumbuh" },
      { name: "description", content: "Tandai kebiasaan harianmu dan pantau streak." },
      { property: "og:title", content: "Kebiasaanku — Tumbuh" },
      { property: "og:description", content: "Tandai kebiasaan harianmu dan pantau streak." },
    ],
  }),
  component: Dashboard,
});

type Habit = { id: string; name: string; emoji: string };

const ymd = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
const lastDays = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d;
  });
const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function streak(done: Set<string>) {
  let s = 0;
  const d = new Date();
  if (!done.has(ymd(d))) d.setDate(d.getDate() - 1);
  while (done.has(ymd(d))) {
    s++;
    d.setDate(d.getDate() - 1);
  }
  return s;
}

function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Record<string, Set<string>>>({});
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🌱");
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const days = lastDays(14);

  const load = useCallback(async () => {
    const [{ data: h }, { data: l }] = await Promise.all([
      supabase.from("habits").select("id,name,emoji").order("created_at"),
      supabase.from("habit_logs").select("habit_id,day").gte("day", ymd(lastDays(60)[0]!)),
    ]);
    setHabits(h ?? []);
    const m: Record<string, Set<string>> = {};
    (l ?? []).forEach((r) => (m[r.habit_id] ??= new Set()).add(r.day));
    setLogs(m);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return navigate({ to: "/auth", replace: true });
      const { data: p } = await supabase.from("profiles").select("display_name").eq("id", data.user.id).maybeSingle();
      setUserName(p?.display_name ?? "");
      const { data: admin } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
      setIsAdmin(!!admin);
      await load();
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_OUT") navigate({ to: "/auth", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await supabase.from("habits").insert({ name: name.trim(), emoji: emoji || "🌱" });
    setName("");
    load();
  }

  async function toggle(id: string, day: string) {
    const has = logs[id]?.has(day);
    const next = new Set(logs[id] ?? []);
    has ? next.delete(day) : next.add(day);
    setLogs({ ...logs, [id]: next });
    if (has) await supabase.from("habit_logs").delete().eq("habit_id", id).eq("day", day);
    else await supabase.from("habit_logs").insert({ habit_id: id, day });
  }

  async function remove(id: string) {
    if (!confirm("Hapus kebiasaan ini?")) return;
    await supabase.from("habits").delete().eq("id", id);
    load();
  }

  if (!ready) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Memuat…</div>;

  const today = ymd(new Date());
  const doneToday = habits.filter((h) => logs[h.id]?.has(today)).length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="flex items-center justify-between">
        <span className="font-display text-2xl font-bold text-primary">WARAS</span>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link to="/admin" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
              Panel admin
            </Link>
          )}
          <button onClick={() => supabase.auth.signOut()} className="rounded-full border px-4 py-2 text-sm hover:bg-secondary">
            Keluar
          </button>
        </div>
      </header>

      <section className="mt-10">
        <h1 className="text-4xl font-bold">Halo, {userName || "teman"} 👋</h1>
        <p className="mt-2 text-muted-foreground">
          Hari ini: {doneToday} dari {habits.length} kebiasaan selesai.
        </p>
      </section>

      <form onSubmit={add} className="mt-8 flex gap-2 rounded-2xl bg-card p-3 shadow-soft">
        <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-14 rounded-xl bg-background text-center text-xl outline-none" maxLength={4} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kebiasaan baru, mis. Jalan pagi" className="flex-1 rounded-xl bg-background px-4 outline-none" />
        <button className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground">Tambah</button>
      </form>

      <section className="mt-8 space-y-4">
        {habits.length === 0 && (
          <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            Belum ada kebiasaan. Tambahkan yang pertama di atas 🌱
          </p>
        )}
        {habits.map((h) => {
          const set = logs[h.id] ?? new Set<string>();
          return (
            <div key={h.id} className="rounded-2xl bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="text-lg font-medium">
                  {h.emoji} {h.name}
                </p>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">🔥 {streak(set)} hari</span>
                  <button onClick={() => remove(h.id)} className="text-sm text-muted-foreground hover:text-destructive" aria-label="Hapus">✕</button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-2 sm:grid-cols-14">
                {days.map((d) => {
                  const k = ymd(d);
                  const on = set.has(k);
                  return (
                    <button
                      key={k}
                      onClick={() => toggle(h.id, k)}
                      className={`flex flex-col items-center rounded-xl py-2 text-xs transition ${
                        on ? "bg-done text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-done-soft"
                      } ${k === today ? "ring-2 ring-ring" : ""}`}
                    >
                      <span>{DAYS[d.getDay()]}</span>
                      <span className="text-sm font-bold">{d.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
