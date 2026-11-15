-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles select" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Owner email becomes admin once its email is confirmed
CREATE OR REPLACE FUNCTION public.grant_owner_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND lower(NEW.email) = 'bima37278@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.grant_owner_admin() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_owner_admin_insert AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_owner_admin();
CREATE TRIGGER on_auth_user_owner_admin_confirm AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_owner_admin();

-- Admin: overview of every user
CREATE OR REPLACE FUNCTION public.admin_user_overview()
RETURNS TABLE (
  user_id uuid, display_name text, email text, joined_at timestamptz,
  habit_count int, checkins_7d int, checkins_total int, last_active date,
  best_current_streak int, longest_streak int
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE today date := (now() AT TIME ZONE 'Asia/Jakarta')::date;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH g AS (
    SELECT l.user_id, l.habit_id, l.day,
           l.day - (row_number() OVER (PARTITION BY l.habit_id ORDER BY l.day))::int AS grp
    FROM public.habit_logs l
  ), isl AS (
    SELECT g.user_id, g.habit_id, max(g.day) AS e, count(*)::int AS len
    FROM g GROUP BY g.user_id, g.habit_id, g.grp
  ), st AS (
    SELECT isl.user_id,
           max(CASE WHEN isl.e >= today - 1 THEN isl.len ELSE 0 END)::int AS cur,
           max(isl.len)::int AS longest
    FROM isl GROUP BY isl.user_id
  ), lg AS (
    SELECT l.user_id,
           count(*) FILTER (WHERE l.day > today - 7)::int AS c7,
           count(*)::int AS ct,
           max(l.day) AS last_day
    FROM public.habit_logs l GROUP BY l.user_id
  ), hb AS (
    SELECT h.user_id, count(*)::int AS n FROM public.habits h GROUP BY h.user_id
  )
  SELECT u.id, p.display_name, u.email::text, u.created_at,
         COALESCE(hb.n, 0), COALESCE(lg.c7, 0), COALESCE(lg.ct, 0), lg.last_day,
         COALESCE(st.cur, 0), COALESCE(st.longest, 0)
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN hb ON hb.user_id = u.id
  LEFT JOIN lg ON lg.user_id = u.id
  LEFT JOIN st ON st.user_id = u.id
  ORDER BY lg.last_day DESC NULLS LAST, u.created_at DESC;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_user_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_user_overview() TO authenticated;

-- Admin: one user's habits with streaks and recent days
CREATE OR REPLACE FUNCTION public.admin_user_habits(_user_id uuid)
RETURNS TABLE (
  habit_id uuid, name text, emoji text, created_at timestamptz,
  current_streak int, longest_streak int, total_checkins int, recent_days date[]
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE today date := (now() AT TIME ZONE 'Asia/Jakarta')::date;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH g AS (
    SELECT l.habit_id, l.day,
           l.day - (row_number() OVER (PARTITION BY l.habit_id ORDER BY l.day))::int AS grp
    FROM public.habit_logs l WHERE l.user_id = _user_id
  ), isl AS (
    SELECT g.habit_id, max(g.day) AS e, count(*)::int AS len FROM g GROUP BY g.habit_id, g.grp
  ), st AS (
    SELECT isl.habit_id,
           max(CASE WHEN isl.e >= today - 1 THEN isl.len ELSE 0 END)::int AS cur,
           max(isl.len)::int AS longest,
           sum(isl.len)::int AS total
    FROM isl GROUP BY isl.habit_id
  )
  SELECT h.id, h.name, h.emoji, h.created_at,
         COALESCE(st.cur, 0), COALESCE(st.longest, 0), COALESCE(st.total, 0),
         COALESCE((SELECT array_agg(l.day ORDER BY l.day) FROM public.habit_logs l
                   WHERE l.habit_id = h.id AND l.day > today - 14), ARRAY[]::date[])
  FROM public.habits h
  LEFT JOIN st ON st.habit_id = h.id
  WHERE h.user_id = _user_id
  ORDER BY h.created_at;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_user_habits(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_user_habits(uuid) TO authenticated;

-- Front-page articles / tips
CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  emoji text NOT NULL DEFAULT '🌱',
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reads published articles" ON public.articles FOR SELECT TO anon, authenticated
  USING (published OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin inserts articles" ON public.articles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin updates articles" ON public.articles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin deletes articles" ON public.articles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
CREATE TRIGGER articles_touch BEFORE UPDATE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.articles (slug, title, emoji, excerpt, content, published, sort_order) VALUES
('mulai-dari-yang-kecil', 'Mulai dari yang kecil', '🌱',
 'Kebiasaan besar tumbuh dari langkah yang hampir terlalu mudah untuk dilewatkan.',
 E'Banyak orang gagal membangun kebiasaan karena memulai terlalu besar. Alih-alih "olahraga satu jam", coba "pakai sepatu olahraga".\n\nLangkah kecil menurunkan hambatan untuk memulai. Begitu kamu sudah bergerak, melanjutkan jauh lebih mudah.\n\nTips: tulis kebiasaanmu dalam versi dua menit, lalu tandai setiap hari di Tumbuh.',
 true, 1),
('jangan-putus-dua-kali', 'Jangan putus dua kali', '🔥',
 'Melewatkan satu hari itu wajar. Yang penting, jangan sampai dua hari berturut-turut.',
 E'Streak memang memotivasi, tapi hidup tidak selalu sesuai rencana. Jika kamu melewatkan satu hari, jangan menyerah.\n\nAturan sederhananya: jangan pernah melewatkan dua kali berturut-turut. Satu hari terlewat adalah kebetulan; dua hari mulai menjadi pola baru.\n\nKembali ke kebiasaanmu besok, meski hanya versi terkecilnya.',
 true, 2),
('tempelkan-pada-rutinitas', 'Tempelkan pada rutinitas', '🔗',
 'Pasangkan kebiasaan baru dengan hal yang sudah rutin kamu lakukan setiap hari.',
 E'Otak kita menyukai pola. Cara mudah membangun kebiasaan baru adalah menempelkannya pada kebiasaan lama.\n\nContoh: "Setelah menyeduh kopi pagi, aku akan membaca satu halaman buku." atau "Setelah menyikat gigi malam, aku akan menulis satu hal yang kusyukuri."\n\nSemakin spesifik pemicunya, semakin besar peluang kebiasaan itu bertahan.',
 true, 3);