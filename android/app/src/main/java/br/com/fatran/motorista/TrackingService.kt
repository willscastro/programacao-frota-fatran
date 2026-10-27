package br.com.fatran.motorista

import android.annotation.SuppressLint
import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.os.Looper
import org.json.JSONObject
import kotlin.concurrent.thread

/** Envia a posição do celular enquanto o motorista está com um veículo escolhido. */
class TrackingService : Service() {
    private var lm: LocationManager? = null
    private val ouvinte = object : LocationListener {
        override fun onLocationChanged(l: Location) { enviar(l) }
        @Deprecated("") override fun onStatusChanged(p: String?, s: Int, e: android.os.Bundle?) {}
        override fun onProviderEnabled(p: String) {}
        override fun onProviderDisabled(p: String) {}
    }

    override fun onBind(i: Intent?): IBinder? = null

    @SuppressLint("MissingPermission")
    override fun onStartCommand(i: Intent?, f: Int, id: Int): Int {
        val canal = "rastreio"
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(canal, "Localização", NotificationManager.IMPORTANCE_LOW))
        val abrir = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val n = Notification.Builder(this, canal).setContentTitle("Fatran Motorista")
            .setContentText("Compartilhando a localização do veículo durante a viagem")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation).setContentIntent(abrir).setOngoing(true).build()
        if (Build.VERSION.SDK_INT >= 29) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION) else startForeground(1, n)
        try {
            lm = getSystemService(Context.LOCATION_SERVICE) as LocationManager
            val intervalo = INTERVALO_MS
            for (p in listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER))
                if (lm!!.isProviderEnabled(p)) lm!!.requestLocationUpdates(p, intervalo, 0f, ouvinte, Looper.getMainLooper())
        } catch (e: SecurityException) { stopSelf() }
        return START_STICKY
    }

    private fun enviar(l: Location) {
        val ctx = applicationContext
        thread {
            try {
                Api.rpc(ctx, "prog_app_posicao", JSONObject().put("p_lat", l.latitude).put("p_lng", l.longitude).put("p_precisao", l.accuracy.toDouble()))
            } catch (e: Exception) { /* sem internet: tenta na próxima leitura */ }
        }
    }

    override fun onDestroy() { lm?.removeUpdates(ouvinte); super.onDestroy() }

    companion object {
        const val INTERVALO_MS = 5 * 60 * 1000L   // 5 minutos
        fun iniciar(c: Context) {
            val i = Intent(c, TrackingService::class.java)
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i) else c.startService(i)
        }
        fun parar(c: Context) { c.stopService(Intent(c, TrackingService::class.java)) }
    }
}
