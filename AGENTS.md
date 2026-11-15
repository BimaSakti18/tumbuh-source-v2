<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Data lives in Lovable Cloud tables (profiles, habits, habit_logs) with own-rows RLS; the browser client reads/writes directly, so every new table needs GRANTs + RLS scoped to auth.uid().
- Admin is a row in public.user_roles checked via has_role(); admin-wide reads go through SECURITY DEFINER functions (admin_user_overview, admin_user_habits) that raise unless the caller is admin — never add broad admin SELECT policies on user tables. Owner email is granted admin by a trigger on email confirmation.
- Admin pages live under src/routes/_authenticated/admin/ (role check in its beforeLoad); public articles are read via createServerFn with the publishable client so the home page and /artikel/$slug SSR for SEO.
- Imported legacy users keep their original user IDs and set a new password through the reset-password email flow (/reset-password); never import password hashes.
