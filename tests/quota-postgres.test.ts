import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

const exec = promisify(execFile);
const container = `confirmationbi-quota-${process.pid}`;
async function sql(query: string) {
  // TCP only becomes available after the image's temporary bootstrap server exits.
  const { stdout } = await exec("docker", ["exec", container, "psql", "-h", "127.0.0.1", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At", "-c", query]);
  return stdout.trim();
}
function reserve(hash: string, client = 100, global = 7, kind = "report", burst = 100) {
  return sql(`set role service_role; select allowed from public.reserve_generation_quota('${kind}', '${hash}', ${client}, ${global}, ${burst});`);
}

describe.skipIf(process.env.RUN_POSTGRES_TESTS !== "1")("real Postgres quota transactions (Docker)", () => {
  beforeAll(async () => {
    await exec("docker", ["run", "--rm", "-d", "--name", container, "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17"]);
    for (let i = 0; i < 50; i++) {
      try { await sql("select 1"); break; }
      catch { if (i === 49) throw new Error("Postgres did not start"); await new Promise(r => setTimeout(r, 200)); }
    }
    await sql("create role anon; create role authenticated; create role service_role bypassrls;");
    await sql(await readFile(new URL("../supabase/migrations/20260912220427_add_atomic_generation_quotas.sql", import.meta.url), "utf8"));
  }, 30000);
  afterAll(async () => { await exec("docker", ["stop", container]); }, 15000);
  beforeEach(async () => { await sql("truncate public.generation_quotas"); });

  test.each(["report", "paid"])("40 concurrent %s reservations never exceed global cap", async (kind) => {
    const results = await Promise.all(Array.from({ length: 40 }, (_, i) => reserve(i.toString(16).padStart(64, "0"), 100, 7, kind)));
    expect(results.filter(r => r.endsWith("t"))).toHaveLength(7);
    expect(await sql(`select count from public.generation_quotas where key = '${kind}:global'`)).toBe("7");
  }, 20000);

  test("concurrent client cap and denial leave global quota unchanged", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => reserve("a".repeat(64), 3, 100)));
    expect(results.filter(r => r.endsWith("t"))).toHaveLength(3);
    expect(await sql("select count from public.generation_quotas where key = 'report:global'")).toBe("3");
  }, 20000);

  test("burst denial is atomic and expired windows reset", async () => {
    expect(await reserve("a".repeat(64), 20, 100, "report", 1)).toMatch(/t$/);
    expect(await reserve("a".repeat(64), 20, 100, "report", 1)).toMatch(/f$/);
    expect(await sql("select count from public.generation_quotas where key = 'report:global'")).toBe("1");
    await sql("update public.generation_quotas set reset_at = now() - interval '1 second'");
    expect(await reserve("a".repeat(64), 20, 100, "report", 1)).toMatch(/t$/);
    expect(await sql("select count from public.generation_quotas where key = 'report:global'")).toBe("1");
  });

  test("browser roles cannot reserve or read counters; RLS is enabled", async () => {
    for (const role of ["anon", "authenticated"]) {
      await expect(sql(`set role ${role}; select * from public.generation_quotas`)).rejects.toThrow();
      await expect(sql(`set role ${role}; select * from public.reserve_generation_quota('paid', '${"a".repeat(64)}', 5, 100, 6)`)).rejects.toThrow();
    }
    expect(await sql("select relrowsecurity from pg_class where oid = 'public.generation_quotas'::regclass")).toBe("t");
    expect(await sql("select prosecdef from pg_proc where oid = 'public.reserve_generation_quota(text,text,integer,integer,integer)'::regprocedure")).toBe("f");
  });

  test("invalid parameters do not allocate counters", async () => {
    await expect(reserve("not-a-hash")).rejects.toThrow();
    await expect(reserve("a".repeat(64), 0)).rejects.toThrow();
    expect(await sql("select count(*) from public.generation_quotas")).toBe("0");
  });
});
