// Gera uma NOVA senha temporária para um usuário que esqueceu/perdeu a senha. Só quem tem "usuarios.gerenciar" consegue chamar.
// Entrada (POST, JSON): { "id": "<uuid do usuário>" }   Saída: { senha_temporaria }  (aparece só nesta resposta)
// O usuário precisará trocar a senha no próximo acesso.

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("ORIGEM_PERMITIDA") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

function senhaTemporaria(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Use POST" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ erro: "Faça login para continuar" }, 401);

  const comoUsuario = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: eu } = await comoUsuario.auth.getUser();
  const { data: pode, error: erroPerm } = await comoUsuario.rpc("prog_tem_permissao", { p: "usuarios.gerenciar" });
  if (!eu?.user || erroPerm || pode !== true) return json({ erro: "Sem permissão para redefinir senhas" }, 403);

  let corpo: { id?: string };
  try { corpo = await req.json(); } catch { return json({ erro: "Corpo da requisição inválido" }, 400); }
  const id = (corpo.id ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ erro: "Usuário inválido" }, 400);
  if (id === eu.user.id) return json({ erro: "Para a sua própria senha, use a troca de senha." }, 400);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: perfil } = await admin.from("prog_perfis").select("id,nome").eq("id", id).maybeSingle();
  if (!perfil) return json({ erro: "Usuário não encontrado" }, 404);

  const senha = senhaTemporaria();
  const { error } = await admin.auth.admin.updateUserById(id, { password: senha });
  if (error) return json({ erro: "Não foi possível redefinir a senha" }, 500);
  const { error: e2 } = await admin.from("prog_perfis").update({ deve_trocar_senha: true }).eq("id", id);
  if (e2) return json({ erro: "Senha redefinida, mas não foi possível exigir a troca no próximo acesso" }, 500);
  return json({ ok: true, nome: perfil.nome, senha_temporaria: senha });
});
