import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/artikel")({
  component: AdminArticles,
});

type Article = Tables<"articles">;
type Draft = Pick<Article, "title" | "slug" | "emoji" | "excerpt" | "content" | "published" | "sort_order">;

const empty: Draft = { title: "", slug: "", emoji: "🌱", excerpt: "", content: "", published: false, sort_order: 0 };

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 80);

function AdminArticles() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "articles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("*").order("sort_order").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  function startEdit(a?: Article) {
    setMsg(null);
    if (a) {
      setEditing(a.id);
      setDraft({ title: a.title, slug: a.slug, emoji: a.emoji, excerpt: a.excerpt, content: a.content, published: a.published, sort_order: a.sort_order });
    } else {
      setEditing("new");
      setDraft({ ...empty, sort_order: (data?.length ?? 0) + 1 });
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const payload = { ...draft, slug: slugify(draft.slug || draft.title) };
    if (!payload.slug) {
      setBusy(false);
      return setMsg("Judul atau slug wajib diisi.");
    }
    const { error } =
      editing === "new"
        ? await supabase.from("articles").insert(payload)
        : await supabase.from("articles").update(payload).eq("id", editing!);
    setBusy(false);
    if (error) return setMsg(error.code === "23505" ? "Slug sudah dipakai artikel lain." : error.message);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin", "articles"] });
  }

  async function remove(a: Article) {
    if (!confirm(`Hapus artikel "${a.title}"?`)) return;
    await supabase.from("articles").delete().eq("id", a.id);
    qc.invalidateQueries({ queryKey: ["admin", "articles"] });
  }

  async function togglePublish(a: Article) {
    await supabase.from("articles").update({ published: !a.published }).eq("id", a.id);
    qc.invalidateQueries({ queryKey: ["admin", "articles"] });
  }

  const input = "w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Artikel & tips</h1>
          <p className="mt-2 text-muted-foreground">Artikel yang ditayangkan muncul di halaman depan.</p>
        </div>
        <button onClick={() => startEdit()} className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground">
          + Artikel baru
        </button>
      </div>

      {editing && (
        <form onSubmit={save} className="mt-8 space-y-3 rounded-2xl bg-card p-6 shadow-soft">
          <h2 className="text-2xl font-bold">{editing === "new" ? "Artikel baru" : "Edit artikel"}</h2>
          <div className="flex gap-3">
            <input className={`${input} w-20 text-center text-xl`} value={draft.emoji} maxLength={4} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} aria-label="Emoji" />
            <input className={input} placeholder="Judul" required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <input className={input} placeholder="Slug (alamat), mis. mulai-dari-yang-kecil — kosongkan untuk otomatis" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
          <input className={input} placeholder="Ringkasan singkat" value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} />
          <textarea className={`${input} min-h-56`} placeholder="Isi artikel. Pisahkan paragraf dengan baris kosong." value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} />
              Tayangkan di halaman depan
            </label>
            <label className="flex items-center gap-2 text-sm">
              Urutan
              <input type="number" className="w-20 rounded-lg border bg-background px-2 py-1" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })} />
            </label>
          </div>
          {msg && <p className="text-sm text-destructive">{msg}</p>}
          <div className="flex gap-2">
            <button disabled={busy} className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-60">
              {busy ? "Menyimpan…" : "Simpan"}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-full border px-6 py-3 hover:bg-secondary">
              Batal
            </button>
          </div>
        </form>
      )}

      {isLoading && <p className="mt-6 text-muted-foreground">Memuat…</p>}
      <div className="mt-8 space-y-3">
        {data?.length === 0 && <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Belum ada artikel.</p>}
        {data?.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-5 shadow-soft">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-medium">{a.emoji} {a.title}</p>
              <p className="truncate text-sm text-muted-foreground">/artikel/{a.slug} · urutan {a.sort_order}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => togglePublish(a)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${a.published ? "bg-done text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {a.published ? "Tayang" : "Draf"}
              </button>
              <button onClick={() => startEdit(a)} className="rounded-full border px-4 py-2 text-sm hover:bg-secondary">Edit</button>
              <button onClick={() => remove(a)} className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-destructive" aria-label="Hapus">✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
