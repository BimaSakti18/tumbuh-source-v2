import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminUsers,
});

const ymd = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const lastDays = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d;
  });
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

function AdminUsers() {
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_user_overview");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = (data ?? []).filter((r) =>
    `${r.display_name ?? ""} ${r.email ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );
  const today = ymd(new Date());
  const activeToday = (data ?? []).filter((r) => r.last_active === today).length;
  const active7 = (data ?? []).filter((r) => r.checkins_7d > 0).length;

  return (
    <div className="mt-10">
      <h1 className="text-4xl font-bold">Aktivitas pengguna</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total pengguna" value={data?.length ?? 0} />
        <Stat label="Aktif hari ini" value={activeToday} />
        <Stat label="Aktif 7 hari terakhir" value={active7} />
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari nama atau email…"
        className="mt-8 w-full rounded-xl border bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
      />

      {isLoading && <p className="mt-6 text-muted-foreground">Memuat…</p>}
      {error && <p className="mt-6 text-destructive">Gagal memuat data: {(error as Error).message}</p>}

      <div className="mt-6 overflow-hidden rounded-2xl bg-card shadow-soft">
        <div className="hidden grid-cols-12 gap-3 border-b px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
          <span className="col-span-4">Pengguna</span>
          <span className="col-span-1 text-center">Kebiasaan</span>
          <span className="col-span-2 text-center">Centang 7 hari</span>
          <span className="col-span-2 text-center">Streak kini / terbaik</span>
          <span className="col-span-3 text-right">Terakhir aktif</span>
        </div>
        {rows.length === 0 && !isLoading && (
          <p className="p-10 text-center text-muted-foreground">Belum ada pengguna.</p>
        )}
        {rows.map((r) => (
          <div key={r.user_id} className="border-b last:border-b-0">
            <button
              onClick={() => setOpen(open === r.user_id ? null : r.user_id)}
              className="grid w-full grid-cols-2 gap-3 px-5 py-4 text-left transition hover:bg-secondary/50 md:grid-cols-12 md:items-center"
            >
              <span className="col-span-2 md:col-span-4">
                <span className="block font-medium">{r.display_name || "Tanpa nama"}</span>
                <span className="block text-sm text-muted-foreground">{r.email}</span>
              </span>
              <span className="text-sm md:col-span-1 md:text-center">
                <span className="md:hidden text-muted-foreground">Kebiasaan: </span>{r.habit_count}
              </span>
              <span className="text-sm md:col-span-2 md:text-center">
                <span className="md:hidden text-muted-foreground">7 hari: </span>{r.checkins_7d}
              </span>
              <span className="text-sm md:col-span-2 md:text-center">
                🔥 {r.best_current_streak} <span className="text-muted-foreground">/ {r.longest_streak} hari</span>
              </span>
              <span className="text-sm text-muted-foreground md:col-span-3 md:text-right">
                {fmtDate(r.last_active)}
              </span>
            </button>
            {open === r.user_id && <UserDetail userId={r.user_id} joined={r.joined_at} total={r.checkins_total} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-soft">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-4xl font-bold text-primary">{value}</p>
    </div>
  );
}

function UserDetail({ userId, joined, total }: { userId: string; joined: string; total: number }) {
  const days = lastDays(14);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "habits", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_user_habits", { _user_id: userId });
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div className="bg-background/60 px-5 pb-5 pt-2">
      <p className="text-sm text-muted-foreground">
        Bergabung {fmtDate(joined)} · {total} centang total
      </p>
      {isLoading && <p className="mt-3 text-sm text-muted-foreground">Memuat…</p>}
      {data?.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Belum membuat kebiasaan.</p>}
      <div className="mt-3 space-y-3">
        {data?.map((h) => {
          const set = new Set(h.recent_days);
          return (
            <div key={h.habit_id} className="rounded-xl bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{h.emoji} {h.name}</p>
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                  🔥 {h.current_streak} hari · terbaik {h.longest_streak} · total {h.total_checkins}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-14 gap-1">
                {days.map((d) => {
                  const k = ymd(d);
                  return (
                    <span
                      key={k}
                      title={k}
                      className={`h-6 rounded-md ${set.has(k) ? "bg-done" : "bg-muted"}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
