// Botão "Atualizar da planilha": chama o aplicativo web do Apps Script (que só LÊ a planilha)
// e devolve o resultado. Só quem pode editar a programação consegue chamar.
// Segredos (Supabase): SYNC_WEBAPP_URL, SYNC_SEGREDO

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Use POST" }, 405);
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ erro: "Faça login para continuar" }, 401);

  const comoUsuario = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: pode } = await comoUsuario.rpc("prog_tem_permissao", { p: "programacao.editar" });
  if (pode !== true) return json({ erro: "Sem permissão para atualizar" }, 403);

  const url = Deno.env.get("SYNC_WEBAPP_URL"), segredo = Deno.env.get("SYNC_SEGREDO");
  if (!url || !segredo) return json({ erro: "Sincronização não configurada" }, 500);

  try {
    const r = await fetch(url, { method: "POST", redirect: "follow", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ segredo }), signal: AbortSignal.timeout(50000) });
    const t = await r.text();
    let corpo: unknown; try { corpo = JSON.parse(t); } catch { return json({ erro: "Resposta inesperada do script da planilha" }, 502); }
    return json(corpo);
  } catch (e) {
    return json({ erro: "Não consegui falar com o script da planilha: " + (e as Error).message }, 504);
  }
});
