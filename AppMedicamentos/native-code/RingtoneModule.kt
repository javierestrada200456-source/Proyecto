package com.javierestrada.appmedicamentos

import android.database.Cursor
import android.media.RingtoneManager
import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class RingtoneModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "RingtoneModule"

  @ReactMethod
  fun getNotificationRingtones(promise: Promise) {
    getRingtones(RingtoneManager.TYPE_NOTIFICATION, promise)
  }

  @ReactMethod
  fun getAlarmRingtones(promise: Promise) {
    getRingtones(RingtoneManager.TYPE_ALARM, promise)
  }

  private fun getRingtones(type: Int, promise: Promise) {
    try {
      val manager = RingtoneManager(reactContext.currentActivity ?: reactContext)
      manager.setType(type)
      val cursor: Cursor = manager.cursor
      val result = Arguments.createArray()

      // Añadir opción "Ninguno" al inicio
      val noneItem = Arguments.createMap()
      noneItem.putString("id", "none")
      noneItem.putString("label", "Ninguno")
      noneItem.putString("uri", "")
      result.pushMap(noneItem)

      while (cursor.moveToNext()) {
        val title = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX)
        val uri: Uri = manager.getRingtoneUri(cursor.position)
        val item = Arguments.createMap()
        item.putString("id", uri.toString())
        item.putString("label", title)
        item.putString("uri", uri.toString())
        result.pushMap(item)
      }
      cursor.close()
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("RINGTONE_ERROR", e.message)
    }
  }
}
