import { createFileRoute, Link } from "@tanstack/react-router";
import { listPublishedArticles } from "@/lib/articles.functions";

export const Route = createFileRoute("/")({
  loader: async () => ({ articles: await listPublishedArticles() }),
  head: () => ({
    meta: [
      { title: "WARAS - Waspada Rawat Sadari" },
      { name: "description", content: "Catat kebiasaan harianmu, jaga streak, dan tumbuh sedikit demi sedikit." },
      { property: "og:title", content: "WARAS - Waspada Rawat Sadari" },
      { property: "og:description", content: "Catat kebiasaan harianmu, jaga streak, dan tumbuh sedikit demi sedikit." },
    ],
  }),
  component: Index,
});

const demo = [3, 5, 2, 6, 7, 4, 7];

function Index() {
  const { articles } = Route.useLoaderData();
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <nav className="flex items-center justify-between py-6">
        <span className="font-display text-2xl font-bold text-primary">WARAS</span>
        <Link to="/auth" className="rounded-full border px-5 py-2 text-sm font-medium hover:bg-secondary">
          Masuk
        </Link>
      </nav>
      <section className="grid flex-1 items-center gap-12 py-12 md:grid-cols-2">
        <div>
          <h1 className="text-5xl font-bold leading-tight md:text-6xl">
            Wujudkan aksi, <span className="italic text-primary">rawat diri sedari dini.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Tandai kebiasaanmu setiap hari, lihat streak tumbuh, dan rawat dirimu dengan lembut.
          </p>
          <Link
            to="/auth"
            className="mt-8 inline-block rounded-full bg-primary px-8 py-4 font-medium text-primary-foreground shadow-soft transition hover:opacity-90"
          >
            Mulai gratis →
          </Link>
        </div>
        <div className="rounded-3xl bg-card p-8 shadow-soft">
          <p className="text-sm text-muted-foreground">Minggu ini</p>
          {["🧘 Meditasi", "📖 Membaca 20 menit", "💧 Minum 8 gelas"].map((h, i) => (
            <div key={h} className="mt-5">
              <p className="font-medium">{h}</p>
              <div className="mt-2 flex gap-2">
                {demo.map((d, j) => (
                  <span
                    key={j}
                    className={`h-8 flex-1 rounded-lg ${(d + i + j) % 3 ? "bg-done" : "bg-muted"}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      {articles.length > 0 && (
        <section className="pb-20">
          <h2 className="text-3xl font-bold md:text-4xl">Tips untuk tumbuh</h2>
          <p className="mt-2 text-muted-foreground">Bacaan singkat untuk membantu kebiasaanmu bertahan.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {articles.map((a) => (
              <Link
                key={a.slug}
                to="/artikel/$slug"
                params={{ slug: a.slug }}
                className="group rounded-3xl bg-card p-6 shadow-soft transition hover:-translate-y-1"
              >
                <p className="text-4xl">{a.emoji}</p>
                <h3 className="mt-4 text-xl font-bold group-hover:text-primary">{a.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{a.excerpt}</p>
                <p className="mt-4 text-sm font-medium text-primary">Baca →</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
