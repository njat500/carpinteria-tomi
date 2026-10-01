import { createHandler } from "../_shared/analyze.ts";
Deno.serve(createHandler({ env: (name) => Deno.env.get(name), fetch }));
