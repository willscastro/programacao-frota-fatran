package br.com.fatran.motorista

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** Acesso ao Supabase por HTTP simples. O motorista só chama as funções prog_app_*. */
object Api {
    private const val URL_BASE = "https://rmlbnqnnanrkvoeqntim.supabase.co"
    private const val CHAVE = "sb_publishable_AZsrZk-4UDIY_G0b8fJojg_DRXeiA7j"

    class ErroApi(msg: String, val codigo: Int) : Exception(msg)

    private fun prefs(c: Context) = c.getSharedPreferences("sessao", Context.MODE_PRIVATE)
    fun logado(c: Context) = prefs(c).getString("refresh", null) != null
    fun sair(c: Context) = prefs(c).edit().clear().apply()

    private fun chamar(metodo: String, caminho: String, corpo: String?, token: String?): String {
        val con = URL(URL_BASE + caminho).openConnection() as HttpURLConnection
        con.requestMethod = metodo
        con.connectTimeout = 15000; con.readTimeout = 20000
        con.setRequestProperty("apikey", CHAVE)
        con.setRequestProperty("Content-Type", "application/json")
        if (token != null) con.setRequestProperty("Authorization", "Bearer $token")
        if (corpo != null) { con.doOutput = true; con.outputStream.use { it.write(corpo.toByteArray()) } }
        val cod = con.responseCode
        val txt = (if (cod in 200..299) con.inputStream else con.errorStream)?.bufferedReader()?.readText() ?: ""
        if (cod !in 200..299) {
            val msg = try { JSONObject(txt).let { it.optString("message", it.optString("msg", it.optString("error_description", txt))) } } catch (e: Exception) { txt }
            throw ErroApi(msg, cod)
        }
        return txt
    }

    private fun guardar(c: Context, r: JSONObject) {
        prefs(c).edit().putString("token", r.getString("access_token")).putString("refresh", r.getString("refresh_token"))
            .putLong("expira", System.currentTimeMillis() / 1000 + r.optLong("expires_in", 3600) - 60).apply()
    }

    fun entrar(c: Context, email: String, senha: String) {
        val r = JSONObject(chamar("POST", "/auth/v1/token?grant_type=password",
            JSONObject().put("email", email.trim()).put("password", senha).toString(), null))
        guardar(c, r)
    }

    private fun token(c: Context): String {
        val p = prefs(c)
        val tk = p.getString("token", null)
        if (tk != null && System.currentTimeMillis() / 1000 < p.getLong("expira", 0)) return tk
        val rf = p.getString("refresh", null) ?: throw ErroApi("Sessão expirada. Entre novamente.", 401)
        try {
            guardar(c, JSONObject(chamar("POST", "/auth/v1/token?grant_type=refresh_token", JSONObject().put("refresh_token", rf).toString(), null)))
        } catch (e: ErroApi) { if (e.codigo in 400..401) sair(c); throw e }
        return p.getString("token", null)!!
    }

    fun rpc(c: Context, nome: String, args: JSONObject = JSONObject()): Any? {
        val t = chamar("POST", "/rest/v1/rpc/$nome", args.toString(), token(c))
        return if (t.isBlank()) null else if (t.trimStart().startsWith("[")) JSONArray(t) else t
    }

    fun trocarSenha(c: Context, nova: String) {
        chamar("PUT", "/auth/v1/user", JSONObject().put("password", nova).toString(), token(c))
        rpc(c, "prog_concluir_troca_senha")
    }
}
