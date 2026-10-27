package br.com.fatran.motorista

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/** Confere se há versão nova do app no site e instala sem precisar baixar manualmente. */
object Atualizador {
    private const val SITE = "https://programacao-frota-fatran.vercel.app"
    private var perguntando = false

    fun conferir(a: Activity) {
        if (perguntando) return
        thread {
            try {
                val con = URL("$SITE/app/versao.json?t=" + System.currentTimeMillis()).openConnection() as HttpURLConnection
                con.connectTimeout = 8000; con.readTimeout = 8000
                val j = JSONObject(con.inputStream.bufferedReader().readText())
                val nova = j.getLong("code")
                val atual = a.packageManager.getPackageInfo(a.packageName, 0).longVersionCode
                if (nova > atual) Handler(Looper.getMainLooper()).post { perguntar(a, j.getString("apk")) }
            } catch (e: Exception) { /* sem internet: tenta depois */ }
        }
    }

    private fun perguntar(a: Activity, caminho: String) {
        if (perguntando || a.isFinishing) return
        perguntando = true
        AlertDialog.Builder(a).setTitle("Nova versão disponível").setMessage("Atualize o aplicativo para continuar.")
            .setCancelable(false)
            .setPositiveButton("Atualizar") { _, _ -> perguntando = false; baixar(a, caminho) }
            .setNegativeButton("Depois") { _, _ -> perguntando = false }.show()
    }

    private fun baixar(a: Activity, caminho: String) {
        Toast.makeText(a, "Baixando atualização…", Toast.LENGTH_LONG).show()
        thread {
            try {
                val dir = File(a.cacheDir, "atualizacoes").apply { mkdirs() }
                val arq = File(dir, "fatran-motorista.apk")
                val con = URL(SITE + caminho + "?t=" + System.currentTimeMillis()).openConnection() as HttpURLConnection
                con.connectTimeout = 15000; con.readTimeout = 60000
                con.inputStream.use { i -> arq.outputStream().use { o -> i.copyTo(o) } }
                Handler(Looper.getMainLooper()).post { instalar(a, arq) }
            } catch (e: Exception) {
                Handler(Looper.getMainLooper()).post { Toast.makeText(a, "Não foi possível baixar a atualização.", Toast.LENGTH_LONG).show() }
            }
        }
    }

    private fun instalar(a: Activity, arq: File) {
        if (!a.packageManager.canRequestPackageInstalls()) {
            Toast.makeText(a, "Permita instalar atualizações deste app e volte para atualizar.", Toast.LENGTH_LONG).show()
            a.startActivity(Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + a.packageName)))
            return
        }
        val uri = FileProvider.getUriForFile(a, a.packageName + ".arquivos", arq)
        a.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}
