package br.com.fatran.motorista

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.*
import org.json.JSONArray
import org.json.JSONObject
import kotlin.concurrent.thread

class MainActivity : Activity() {
    private val ui = Handler(Looper.getMainLooper())
    private lateinit var raiz: LinearLayout
    private var atualizador: Runnable? = null

    private val azul = Color.parseColor("#2563EB")
    private val verde = Color.parseColor("#16A34A")
    private val laranja = Color.parseColor("#EA580C")
    private val cinza = Color.parseColor("#64748B")

    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) // celular da empresa fica ligado no veículo
        val rolagem = ScrollView(this)
        raiz = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(20), dp(28), dp(20), dp(20)) }
        rolagem.addView(raiz)
        setContentView(rolagem)
        if (Api.logado(this)) iniciar() else telaLogin()
    }

    override fun onDestroy() { pararAtualizacao(); super.onDestroy() }

    // ---------- utilidades de tela ----------
    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()
    private fun limpar(titulo: String, sub: String? = null) {
        pararAtualizacao()
        raiz.removeAllViews()
        raiz.addView(TextView(this).apply { text = titulo; textSize = 24f; setTypeface(null, Typeface.BOLD); setTextColor(Color.parseColor("#0F172A")) })
        if (sub != null) raiz.addView(TextView(this).apply { text = sub; textSize = 14f; setTextColor(cinza); setPadding(0, dp(4), 0, dp(12)) })
    }
    private fun texto(t: String, tam: Float = 16f, cor: Int = Color.parseColor("#0F172A")) =
        TextView(this).apply { text = t; textSize = tam; setTextColor(cor); setPadding(0, dp(6), 0, dp(6)) }.also { raiz.addView(it) }
    private fun botao(t: String, cor: Int = azul, grande: Boolean = true, acao: () -> Unit): Button =
        Button(this).apply {
            text = t; setTextColor(Color.WHITE); textSize = if (grande) 18f else 15f; isAllCaps = false
            background = GradientDrawable().apply { setColor(cor); cornerRadius = dp(14).toFloat() }
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(if (grande) 68 else 50)).apply { topMargin = dp(10) }
            setOnClickListener { acao() }
        }.also { raiz.addView(it) }
    private fun campo(dica: String, senha: Boolean = false, email: Boolean = false) =
        EditText(this).apply {
            hint = dica; textSize = 17f; setSingleLine()
            inputType = when { senha -> InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD; email -> InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS; else -> InputType.TYPE_CLASS_TEXT }
        }.also { raiz.addView(it) }
    private fun aviso(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
    private fun emFundo(trabalho: () -> Unit, erro: (Exception) -> Unit = { aviso(it.message ?: "Erro") }) {
        thread { try { trabalho() } catch (e: Exception) { ui.post { erro(e) } } }
    }
    private fun pararAtualizacao() { atualizador?.let { ui.removeCallbacks(it) }; atualizador = null }

    // ---------- telas ----------
    private fun telaLogin() {
        limpar("Fatran Motorista", "Entre com o e-mail e a senha que a empresa passou para você.")
        val e = campo("E-mail", email = true)
        val s = campo("Senha", senha = true)
        botao("Entrar") {
            val em = e.text.toString(); val se = s.text.toString()
            if (em.isBlank() || se.isBlank()) return@botao aviso("Informe e-mail e senha.")
            emFundo({ Api.entrar(this, em, se); ui.post { iniciar() } },
                { aviso(if (it is Api.ErroApi && it.codigo == 400) "E-mail ou senha incorretos." else it.message ?: "Erro") })
        }
    }

    private fun iniciar() {
        limpar("Carregando…")
        emFundo({
            val p = Api.rpc(this, "prog_app_perfil") as JSONArray
            ui.post {
                if (p.length() == 0) return@post semAcesso()
                val o = p.getJSONObject(0)
                when {
                    o.optBoolean("deve_trocar_senha") -> telaTrocaSenha(o.getString("nome"))
                    o.isNull("ciencia_em") -> telaCiencia(o.getString("nome"))
                    else -> situacao(o.getString("nome"))
                }
            }
        }, { if (it is Api.ErroApi && it.codigo == 401) telaLogin() else erroConexao(it) })
    }

    private fun semAcesso() {
        limpar("Sem acesso", "Seu usuário ainda não está liberado como motorista. Fale com o programador da frota.")
        botao("Sair", cinza) { Api.sair(this); telaLogin() }
    }
    private fun erroConexao(e: Exception) {
        limpar("Sem conexão", e.message)
        botao("Tentar de novo") { iniciar() }
        botao("Sair", cinza, false) { Api.sair(this); telaLogin() }
    }

    private fun telaTrocaSenha(nome: String) {
        limpar("Olá, $nome", "Por segurança, crie uma senha nova (mínimo 6 caracteres).")
        val a = campo("Nova senha", senha = true); val b = campo("Repita a nova senha", senha = true)
        botao("Salvar senha") {
            val x = a.text.toString()
            if (x.length < 6) return@botao aviso("Use pelo menos 6 caracteres.")
            if (x != b.text.toString()) return@botao aviso("As senhas não conferem.")
            if (x == "123456") return@botao aviso("Escolha uma senha diferente da provisória.")
            emFundo({ Api.trocarSenha(this, x); ui.post { iniciar() } })
        }
    }

    private fun telaCiencia(nome: String) {
        limpar("Olá, $nome", "Antes de começar, leia com atenção:")
        texto("Este aplicativo mostra à empresa a posição do veículo durante a sua jornada, para acompanhar as viagens e atualizar a programação automaticamente.", 16f)
        texto("• A posição só é enviada depois que você escolhe o veículo.\n• Só a equipe autorizada da Fatran vê esses dados.\n• O histórico é apagado após 90 dias.", 15f, cinza)
        botao("Li e estou ciente", verde) { emFundo({ Api.rpc(this, "prog_app_dar_ciencia"); ui.post { iniciar() } }) }
        botao("Sair", cinza, false) { Api.sair(this); telaLogin() }
    }

    private fun situacao(nome: String) {
        emFundo({
            val s = Api.rpc(this, "prog_app_situacao") as JSONArray
            ui.post { if (s.length() == 0) escolherVeiculo(nome) else painel(nome, s.getJSONObject(0)) }
        }, { erroConexao(it) })
    }

    private fun escolherVeiculo(nome: String) {
        TrackingService.parar(this)
        limpar("Olá, $nome", "Escolha o veículo em que você está:")
        emFundo({
            val l = Api.rpc(this, "prog_app_conjuntos") as JSONArray
            ui.post {
                if (l.length() == 0) texto("Nenhum veículo no quadro de hoje. Fale com o programador.")
                for (i in 0 until l.length()) {
                    val c = l.getJSONObject(i)
                    val imp = if (c.isNull("placa_implemento")) "" else "  /  " + c.getString("placa_implemento")
                    val ocup = c.optBoolean("ocupado")
                    botao(c.getString("placa_cavalo") + imp + if (ocup) "  (em uso)" else "", if (ocup) cinza else azul, false) {
                        if (ocup) return@botao aviso("Este veículo já está com outro motorista.")
                        AlertDialog.Builder(this).setTitle("Confirmar veículo").setMessage("Você está com o " + c.getString("placa_cavalo") + "?")
                            .setPositiveButton("Sim") { _, _ -> emFundo({ Api.rpc(this, "prog_app_escolher_conjunto", JSONObject().put("p_conjunto_id", c.getLong("conjunto_id"))); ui.post { situacao(nome) } }) }
                            .setNegativeButton("Não", null).show()
                    }
                }
                botao("Sair", cinza, false) { Api.sair(this); telaLogin() }
            }
        })
    }

    private fun painel(nome: String, s: JSONObject) {
        limpar(s.getString("placa_cavalo"), nome)
        iniciarRastreio()
        val st = s.getString("status")
        texto("Situação: $st", 18f, azul)
        if (!s.isNull("embarcador")) texto("Embarcador: " + s.getString("embarcador"))
        if (!s.isNull("destino")) texto("Destino: " + s.getString("destino"))
        fun acao(rotulo: String, codigo: String, cor: Int, msg: String) = botao(rotulo, cor) {
            AlertDialog.Builder(this).setTitle(rotulo).setMessage(msg)
                .setPositiveButton("Confirmar") { _, _ -> emFundo({ Api.rpc(this, "prog_app_acao", JSONObject().put("p_acao", codigo)); ui.post { aviso("Registrado!"); situacao(nome) } }) }
                .setNegativeButton("Cancelar", null).show()
        }
        val emDescarga = st == "AG. DESCARGA"
        val carregado = !s.isNull("carregou_em")
        if (emDescarga) {
            acao("✅ Descarga finalizada", "fim_descarga", verde, "Confirma que terminou de descarregar?")
        } else if (st == "AG. CARREGAMENTO" && !carregado) {
            acao("🚛 Carregamento finalizado / saí", "saiu_carregado", verde, "Confirma que terminou de carregar e está saindo?")
        } else {
            acao("📍 Cheguei para carregar", "chegou_carga", azul, "Confirma que chegou no local de carregamento?")
            acao("📍 Cheguei para descarregar", "chegou_descarga", laranja, "Confirma que chegou no local de descarga?")
            if (st != "AG. CARREGAMENTO") acao("🚛 Carregamento finalizado / saí", "saiu_carregado", verde, "Confirma que está saindo carregado?")
        }
        botao("Trocar de veículo", cinza, false) { emFundo({ Api.rpc(this, "prog_app_liberar"); ui.post { situacaoTrocar(nome) } }) }
        botao("Sair", cinza, false) { TrackingService.parar(this); Api.sair(this); telaLogin() }
        val r = Runnable { situacao(nome) }
        atualizador = r; ui.postDelayed(r, 60000)
    }

    /** Libera o veículo atual para escolher outro (o gestor também pode ajustar pelo quadro). */
    private fun situacaoTrocar(nome: String) = escolherVeiculo(nome)

    // ---------- permissões e rastreio ----------
    private fun iniciarRastreio() {
        val pedir = mutableListOf<String>()
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) pedir.add(Manifest.permission.ACCESS_FINE_LOCATION)
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) pedir.add(Manifest.permission.POST_NOTIFICATIONS)
        if (pedir.isNotEmpty()) requestPermissions(pedir.toTypedArray(), 1) else TrackingService.iniciar(this)
    }
    override fun onRequestPermissionsResult(c: Int, p: Array<out String>, r: IntArray) {
        super.onRequestPermissionsResult(c, p, r)
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) TrackingService.iniciar(this)
        else aviso("Sem a permissão de localização o veículo não aparece no mapa da empresa.")
    }
}
