import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: context.user.id, _role: "admin" });
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Admin — Tumbuh" },
      { name: "description", content: "Panel admin Tumbuh." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const tab = "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary";
  const active = { className: "bg-primary text-primary-foreground hover:bg-primary" };
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-display text-2xl font-bold text-primary">WARAS</Link>
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">Admin</span>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          <Link to="/admin" activeOptions={{ exact: true }} className={tab} activeProps={active}>Pengguna</Link>
          <Link to="/admin/artikel" className={tab} activeProps={active}>Artikel</Link>
          <Link to="/dashboard" className={tab}>Kebiasaanku</Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
            className="rounded-full border px-4 py-2 text-sm hover:bg-secondary"
          >
            Keluar
          </button>
        </nav>
      </header>
      <Outlet />
    </main>
  );
}
