package com.javierestrada.appmedicamentos

import android.app.Activity
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.view.WindowManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class AlarmModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AlarmModule"

  @ReactMethod
  fun scheduleAlarm(delaySeconds: Double) {
    scheduleAlarmWithData(delaySeconds, null)
  }

  @ReactMethod
  fun scheduleAlarmWithData(delaySeconds: Double, data: ReadableMap?) {
    val context = reactContext.applicationContext
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val triggerAtMillis = System.currentTimeMillis() + (delaySeconds * 1000).toLong()

    val receiverIntent = Intent(context, AlarmReceiver::class.java)
    // Put data into intent
    if (data != null) {
      val iterator = data.keySetIterator()
      while (iterator.hasNextKey()) {
        val key = iterator.nextKey()
        when (data.getType(key)) {
            com.facebook.react.bridge.ReadableType.String -> receiverIntent.putExtra(key, data.getString(key))
            com.facebook.react.bridge.ReadableType.Boolean -> receiverIntent.putExtra(key, data.getBoolean(key))
            com.facebook.react.bridge.ReadableType.Number -> receiverIntent.putExtra(key, data.getInt(key)) // getInt returns Int (via double cast usually, but safe here)
            // Note: ReadableMap.getInt actually returns Int.
            else -> {}
        }
      }
    }
    // Add isAlarm flag purely for Receiver logic if needed
    receiverIntent.putExtra("isAlarm", true)

    val pendingReceiver = PendingIntent.getBroadcast(
      context,
      0,
      receiverIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val alarmClockInfo = AlarmManager.AlarmClockInfo(triggerAtMillis, pendingReceiver)
    alarmManager.setAlarmClock(alarmClockInfo, pendingReceiver)
  }

  @ReactMethod
  fun checkExactAlarmPermission(promise: Promise) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      promise.resolve(alarmManager.canScheduleExactAlarms())
    } else {
        promise.resolve(true)
    }
  }

  @ReactMethod
  fun requestExactAlarmPermission() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      if (!alarmManager.canScheduleExactAlarms()) {
        val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
        intent.data = Uri.parse("package:" + reactContext.packageName)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(intent)
      }
    }
  }

  @ReactMethod
  fun isLocked(promise: Promise) {
      val keyguardManager = reactContext.getSystemService(Context.KEYGUARD_SERVICE) as android.app.KeyguardManager
      promise.resolve(keyguardManager.isKeyguardLocked)
  }

  @ReactMethod
  fun openNotificationSettings() {
    val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
      putExtra(Settings.EXTRA_APP_PACKAGE, reactContext.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun unlockScreen() {
      val activity = getCurrentActivity()
      if (activity != null) {
          activity.runOnUiThread {
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                  activity.setShowWhenLocked(true)
                  activity.setTurnScreenOn(true)
              } else {
                  activity.window.addFlags(
                      WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                      WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
              WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                  )
              }
          }
      }
  }

    @ReactMethod
    fun moveTaskToBack() {
      val activity = getCurrentActivity()
      if (activity != null) {
        activity.runOnUiThread {
          activity.moveTaskToBack(true)
        }
      }
    }

  @ReactMethod
  fun getLaunchAlarmData(promise: Promise) {
    try {
        val activity = getCurrentActivity()
        if (activity != null) {
            val intent = activity.getIntent()
            if (intent != null && intent.getBooleanExtra("isAlarm", false)) {
                val map = com.facebook.react.bridge.Arguments.createMap()
                map.putBoolean("isAlarm", true)
                
                val extras = intent.getExtras()
                if (extras != null) {
                   for (key in extras.keySet()) {
                       val value = extras.get(key)
                       if (value is String) map.putString(key, value)
                       if (value is Int) map.putInt(key, value)
                       if (value is Boolean) map.putBoolean(key, value)
                   }
                }
                
                intent.removeExtra("isAlarm")
                promise.resolve(map)
                return
            }
        }
        promise.resolve(null)
    } catch (e: Exception) {
        promise.resolve(null)
    }
  }
}