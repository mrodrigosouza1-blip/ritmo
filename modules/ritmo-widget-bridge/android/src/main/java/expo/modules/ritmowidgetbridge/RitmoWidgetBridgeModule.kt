package expo.modules.ritmowidgetbridge

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val PREFS_NAME = "ritmo_widget"
private const val KEY_SNAPSHOT = "snapshot_json"
private const val ACTION_RELOAD_WIDGET = "com.locione.ritmo.RELOAD_WIDGET"

class RitmoWidgetBridgeModule : Module() {
  private val context: Context
    get() = appContext.reactContext?.applicationContext ?: throw IllegalStateException("React context not available")

  override fun definition() = ModuleDefinition {
    Name("RitmoWidgetBridge")

    AsyncFunction("writeSnapshotAndroid") { json: String ->
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY_SNAPSHOT, json)
        .apply()
    }

    AsyncFunction("reloadAndroidWidget") {
      val intent = Intent(ACTION_RELOAD_WIDGET).apply {
        setPackage(context.packageName)
      }
      context.sendBroadcast(intent)
    }
  }

  companion object {
    const val PREFS_NAME_PUBLIC = PREFS_NAME
    const val KEY_SNAPSHOT_PUBLIC = KEY_SNAPSHOT
    const val ACTION_RELOAD_WIDGET_PUBLIC = ACTION_RELOAD_WIDGET
  }
}
