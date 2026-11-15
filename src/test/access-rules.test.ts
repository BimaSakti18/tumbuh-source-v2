import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

// Live checks against the project backend with the public (signed-out) key.
function env(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  try {
    const line = readFileSync(".env", "utf8").split("\n").find((l) => l.startsWith(`${name}=`));
    return line?.slice(name.length + 1).replace(/^"|"$/g, "");
  } catch {
    return undefined;
  }
}

const url = env("VITE_SUPABASE_URL");
const key = env("VITE_SUPABASE_PUBLISHABLE_KEY");
const run = url && key ? describe : describe.skip;

run("access rules for signed-out visitors", () => {
  const sb = createClient(url!, key!, { auth: { persistSession: false } });

  it("cannot open the admin user overview", async () => {
    const { data, error } = await sb.rpc("admin_user_overview");
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("cannot open another user's habits through the admin view", async () => {
    const { error } = await sb.rpc("admin_user_habits", { _user_id: "00000000-0000-0000-0000-000000000000" });
    expect(error).not.toBeNull();
  });

  it("only sees published articles", async () => {
    const { data, error } = await sb.from("articles").select("published");
    expect(error).toBeNull();
    expect((data ?? []).every((a) => a.published === true)).toBe(true);
  });

  it("cannot create articles", async () => {
    const { error } = await sb.from("articles").insert({ slug: "uji-akses", title: "Uji" });
    expect(error).not.toBeNull();
  });

  it("cannot read anyone's habits", async () => {
    const { data } = await sb.from("habits").select("id");
    expect(data ?? []).toHaveLength(0);
  });
});
