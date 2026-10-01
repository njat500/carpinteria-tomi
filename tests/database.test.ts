import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
const projectId = "33333333-3333-4333-8333-333333333333";
let db: PGlite;
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec("set role authenticated");
}
beforeAll(async () => {
  db = new PGlite();
  // Supabase-provided schemas are represented locally. Application migration is unmodified.
  await db.exec(`create role authenticated; create role anon;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    insert into auth.users values ('${a}'), ('${b}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
    grant usage on schema public, auth, storage to authenticated, anon;
    grant select, insert, update, delete on storage.objects to authenticated;`);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261001000000_workshop.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}, 20000);
afterAll(async () => {
  await db?.close();
});
describe("esquema PostgreSQL y permisos por usuario", () => {
  it("aísla proyectos y bloquea suplantación de propietario", async () => {
    await asUser(a);
    await db.query(
      "insert into public.projects(id, owner_id, name, payload) values($1,$2,$3,$4)",
      [projectId, a, "Estantería", "{}"],
    );
    expect(
      (await db.query("select id from public.projects")).rows,
    ).toHaveLength(1);
    await asUser(b);
    expect(
      (await db.query("select id from public.projects")).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query(
          "update public.projects set name = 'Invadido', revision = 2 where id = $1 returning id",
          [projectId],
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      db.query(
        "insert into public.projects(id, owner_id, name, payload) values($1,$2,$3,$4)",
        ["44444444-4444-4444-8444-444444444444", a, "Ajeno", "{}"],
      ),
    ).rejects.toThrow(/row-level security/i);
  });
  it("respeta revisiones y evita sobrescribir una versión nueva", async () => {
    await asUser(a);
    await expect(
      db.query("update public.projects set revision=5 where id=$1", [
        projectId,
      ]),
    ).rejects.toThrow(/Revision conflict/);
    const updated = await db.query(
      "update public.projects set revision=2 where id=$1 and revision=1 returning revision",
      [projectId],
    );
    expect(updated.rows).toEqual([{ revision: 2 }]);
    const stale = await db.query(
      "update public.projects set revision=2 where id=$1 and revision=1 returning revision",
      [projectId],
    );
    expect(stale.rows).toHaveLength(0);
  });
  it("mantiene los archivos privados dentro de la carpeta del usuario", async () => {
    await asUser(a);
    await db.query(
      "insert into storage.objects(bucket_id,name) values('plans',$1)",
      [`${a}/project/photo`],
    );
    expect(
      (await db.query("select name from storage.objects")).rows,
    ).toHaveLength(1);
    await asUser(b);
    expect(
      (await db.query("select name from storage.objects")).rows,
    ).toHaveLength(0);
    await expect(
      db.query(
        "insert into storage.objects(bucket_id,name) values('plans',$1)",
        [`${a}/project/other`],
      ),
    ).rejects.toThrow(/row-level security/i);
  });
  it("aplica el cupo de IA de forma independiente por usuario", async () => {
    await asUser(a);
    for (let i = 0; i < 20; i++)
      expect(
        (
          await db.query<{ allowed: boolean }>(
            "select public.consume_plan_analysis() as allowed",
          )
        ).rows[0].allowed,
      ).toBe(true);
    expect(
      (
        await db.query<{ allowed: boolean }>(
          "select public.consume_plan_analysis() as allowed",
        )
      ).rows[0].allowed,
    ).toBe(false);
    await expect(
      db.query("select * from public.ai_daily_usage"),
    ).rejects.toThrow(/permission denied/i);
    await asUser(b);
    expect(
      (
        await db.query<{ allowed: boolean }>(
          "select public.consume_plan_analysis() as allowed",
        )
      ).rows[0].allowed,
    ).toBe(true);
  });
});
