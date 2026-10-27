// Cria um usuário do sistema. Só quem tem a permissão "usuarios.gerenciar" consegue chamar.
// Roda no servidor porque usa a chave de administração, que nunca pode ir para o navegador.
//
// Entrada (POST, JSON): { "email": "...", "nome": "...", "papel": "programador" }
// Saída: { id, email, papel, senha_temporaria }  (a senha aparece só nesta resposta)

import { createClient } from "npm:@supabase/supabase-js@2";

const origem = Deno.env.get("ORIGEM_PERMITIDA") ?? "*";
const cors = {
  "Access-Control-Allow-Origin": origem,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

// 14 caracteres sem letras parecidas (0/O, 1/l/I)
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

  // 1) Quem chama precisa ter permissão para gerenciar usuários (conferido pelo banco)
  const comoUsuario = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: pode, error: erroPerm } = await comoUsuario.rpc("prog_tem_permissao", { p: "usuarios.gerenciar" });
  if (erroPerm || pode !== true) return json({ erro: "Sem permissão para criar usuários" }, 403);

  // 2) Valida os dados
  let corpo: { email?: string; nome?: string; papel?: string };
  try {
    corpo = await req.json();
  } catch {
    return json({ erro: "Corpo da requisição inválido" }, 400);
  }
  const email = (corpo.email ?? "").trim().toLowerCase();
  const nome = (corpo.nome ?? "").trim();
  const papel = (corpo.papel ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ erro: "E-mail inválido" }, 400);
  if (nome.length < 2) return json({ erro: "Informe o nome" }, 400);

  // 3) Cria com a chave de administração
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: papelOk } = await admin.from("prog_papeis").select("codigo").eq("codigo", papel).maybeSingle();
  if (!papelOk) return json({ erro: "Perfil inexistente" }, 400);

  const senha = senhaTemporaria();
  const { data: criado, error: erroCriar } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (erroCriar || !criado.user) {
    return json({ erro: erroCriar?.message?.includes("already") ? "Este e-mail já tem cadastro" : "Não foi possível criar o usuário" }, 400);
  }

  const { error: erroPerfil } = await admin.from("prog_perfis").insert({
    id: criado.user.id,
    nome,
    papel,
    ativo: true,
    deve_trocar_senha: true,
  });
  if (erroPerfil) {
    await admin.auth.admin.deleteUser(criado.user.id); // não deixa conta sem perfil
    return json({ erro: "Não foi possível criar o perfil do usuário" }, 500);
  }

  return json({ id: criado.user.id, email, papel, senha_temporaria: senha }, 201);
});
