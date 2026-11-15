import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getPublishedArticle } from "@/lib/articles.functions";

export const Route = createFileRoute("/artikel/$slug")({
  loader: async ({ params }) => {
    const article = await getPublishedArticle({ data: { slug: params.slug } });
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData }) => {
    const a = loaderData?.article;
    const title = a ? `${a.title} — Tumbuh` : "Artikel tidak tersedia — Tumbuh";
    const description = a?.excerpt || "Tips membangun kebiasaan baik dari Tumbuh.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        ...(a ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  notFoundComponent: () => (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl">🍂</p>
      <h1 className="mt-4 text-3xl font-bold">Artikel tidak ditemukan</h1>
      <Link to="/" className="mt-6 text-primary underline">Kembali ke beranda</Link>
    </main>
  ),
  component: ArticlePage,
});

function ArticlePage() {
  const { article } = Route.useLoaderData();
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 pb-20">
      <nav className="flex items-center justify-between py-6">
        <Link to="/" className="font-display text-2xl font-bold text-primary">🌿 Tumbuh</Link>
        <Link to="/auth" className="rounded-full border px-5 py-2 text-sm font-medium hover:bg-secondary">Masuk</Link>
      </nav>
      <article className="mt-8">
        <p className="text-5xl">{article.emoji}</p>
        <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">{article.title}</h1>
        {article.excerpt && <p className="mt-4 text-lg text-muted-foreground">{article.excerpt}</p>}
        <div className="mt-8 space-y-5 text-lg leading-relaxed">
          {article.content
            .split(/\n\s*\n/)
            .filter((p) => p.trim())
            .map((p, i) => (
              <p key={i} className="whitespace-pre-line">{p.trim()}</p>
            ))}
        </div>
      </article>
      <div className="mt-12 rounded-3xl bg-card p-8 text-center shadow-soft">
        <p className="font-display text-2xl font-bold">Siap mencoba?</p>
        <Link to="/auth" className="mt-4 inline-block rounded-full bg-primary px-8 py-3 font-medium text-primary-foreground">
          Mulai gratis →
        </Link>
      </div>
    </main>
  );
}
