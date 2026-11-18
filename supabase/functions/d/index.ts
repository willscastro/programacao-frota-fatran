// Link curto e temporário para documentos. Pública (sem login): quem tem o código abre o arquivo enquanto não expirar.
// /d/CODIGO (rota do Vercel) -> esta função -> confere a validade -> redireciona para um link assinado de 2 minutos.
import { createClient } from "npm:@supabase/supabase-js@2";

const TEXTO = (msg: string, status: number) =>
  new Response(msg, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
const MAX_MS = 24 * 3600 * 1000; // teto: nenhum link vale mais que 24 h, mesmo que o registro diga outra coisa

Deno.serve(async (req) => {
  const codigo = (new URL(req.url).searchParams.get("c") || "").trim();
  if (!/^[A-Za-z0-9]{6,32}$/.test(codigo)) return TEXTO("Link inválido.", 404);
  // prévias de link (WhatsApp etc.) não devem gastar nem abrir o documento
  const ua = req.headers.get("user-agent") || "";
  if (req.method === "HEAD" || /WhatsApp|facebookexternalhit|Facebot|TelegramBot|Slackbot|bot\b|crawler|preview/i.test(ua)) return TEXTO("Documento protegido.", 200);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: l } = await sb.from("prog_links").select("arquivo, expira_em, criado_em, acessos").eq("codigo", codigo).maybeSingle();
  if (!l) return TEXTO("Link inválido ou já removido. Peça um novo a quem enviou.", 404);
  const fim = Math.min(new Date(l.expira_em).getTime(), new Date(l.criado_em).getTime() + MAX_MS);
  if (Date.now() > fim) return TEXTO("Este link expirou. Peça um novo a quem enviou.", 410);

  const { data: s, error } = await sb.storage.from("prog-docs").createSignedUrl(l.arquivo, 120);
  if (error || !s?.signedUrl) return TEXTO("Documento indisponível no momento. Peça um novo link.", 404);
  await sb.from("prog_links").update({ acessos: (l.acessos || 0) + 1, ultimo_acesso: new Date().toISOString() }).eq("codigo", codigo);
  return new Response(null, { status: 302, headers: { location: s.signedUrl, "cache-control": "no-store", "referrer-policy": "no-referrer" } });
});
