package com.javierestrada.appmedicamentos

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.KeyguardManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import androidx.core.app.NotificationCompat

class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channelId = "alarm_channel"
    val notificationId = 1001

    // Manejar acción de cerrar notificación (Entendido)
    if (intent.action == "DISMISS_ALARM") {
        notificationManager.cancel(intent.getIntExtra("notificationId", notificationId))
        return
    }

    // 1. Despertar dispositivo (WakeLock)
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    val wakeLock = powerManager.newWakeLock(
      PowerManager.FULL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
      "AppMedicamentos:AlarmWakeLock"
    )
    wakeLock.acquire(3000) // Mantener despierto 3 seg para asegurar que la activity prenda

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      // Usar USAGE_ALARM para que el sonido no sea silenciado por "Vibrar" ni DnD en muchos dispositivos
      val soundUri = Uri.parse("android.resource://${context.packageName}/raw/tono_recordatorio")
      val audioAttrs = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
        .build()
      val channel = NotificationChannel(
        channelId,
        "Alarmas",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
        setSound(soundUri, audioAttrs)
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 300, 200, 300)
      }
      notificationManager.createNotificationChannel(channel)
    }

    // Detectar si está bloqueado
    val keyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
    val isLocked = keyguardManager.isKeyguardLocked
    
    // Resolve icon ID dynamically to avoid R class issues
    val smallIconResId = context.resources.getIdentifier("ic_launcher", "mipmap", context.packageName)

    // Intent de pantalla completa hacia MainActivity
    val fullScreenIntent = Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NO_USER_ACTION
        putExtra("isAlarm", true)
        // Pasar extras del intent original
        intent.extras?.let { putExtras(it) }
    }

    val fullScreenPendingIntent = PendingIntent.getActivity(
        context,
        1,
        fullScreenIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val notification = NotificationCompat.Builder(context, channelId)
      .setSmallIcon(smallIconResId)
      .setContentTitle(intent.getStringExtra("medName") ?: "Recordatorio de Medicamento")
      .setContentText(intent.getStringExtra("medInfo") ?: "Es hora de tomar tu medicamento")
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setAutoCancel(false)
      .setOngoing(true)
      .setContentIntent(fullScreenPendingIntent)
      .setFullScreenIntent(fullScreenPendingIntent, true)
      .build()

    notificationManager.notify(notificationId, notification)
  }
}
