DROP POLICY "public reads published articles" ON public.articles;
CREATE POLICY "anon reads published articles" ON public.articles FOR SELECT TO anon
  USING (published);
CREATE POLICY "users read published or admin reads all" ON public.articles FOR SELECT TO authenticated
  USING (published OR public.has_role(auth.uid(), 'admin'));