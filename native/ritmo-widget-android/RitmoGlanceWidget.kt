package com.locione.ritmo

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.Color

private const val PREFS_NAME = "ritmo_widget"
private const val KEY_SNAPSHOT = "snapshot_json"

class RitmoGlanceWidget : GlanceAppWidget() {

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    provideContent {
      val snapshot = loadSnapshot(context)
      val sizeClass = currentSize(context, id)
      val date = snapshot.today.date
      val clickAction = actionRunCallback<OpenRitmoTodayCallback>(
        parameters = actionParametersOf(OpenRitmoTodayCallback.KEY_DATE to date)
      )
      when {
        sizeClass == SizeClass.Small -> SmallContent(snapshot, clickAction)
        else -> MediumContent(snapshot, clickAction)
      }
    }
  }

  private suspend fun loadSnapshot(context: Context): WidgetSnapshot {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val json = prefs.getString(KEY_SNAPSHOT, null)
    return WidgetSnapshot.fromJson(json ?: "{}") ?: WidgetSnapshot.empty()
  }

  private fun currentSize(context: Context, id: GlanceId): SizeClass {
    return try {
      val glanceAppWidgetId = id as? androidx.glance.appwidget.GlanceAppWidgetId
      if (glanceAppWidgetId != null) {
        val opts = android.appwidget.AppWidgetManager.getInstance(context)
          .getAppWidgetOptions(glanceAppWidgetId.appWidgetId)
        val minWidth = opts.getInt(android.appwidget.AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
        if (minWidth < 180) SizeClass.Small else SizeClass.Medium
      } else SizeClass.Medium
    } catch (_: Exception) {
      SizeClass.Medium
    }
  }
}

private enum class SizeClass { Small, Medium }

private class OpenRitmoTodayCallback : androidx.glance.appwidget.action.ActionCallback {
  override suspend fun onAction(
    context: Context,
    glanceId: androidx.glance.GlanceId,
    parameters: ActionParameters
  ) {
    val date = parameters.getOrDefault(KEY_DATE, "")
    val uri = if (date.isNotEmpty()) "ritmo://today?date=$date" else "ritmo://today"
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  }

  companion object {
    val KEY_DATE = ActionParameters.Key<String>("ritmo_date")
  }
}

@androidx.compose.runtime.Composable
private fun SmallContent(snapshot: WidgetSnapshot, onClick: androidx.glance.action.Action) {
  val progress = snapshot.today.progressPercent
  val isDone = progress >= 100
  val hasNext = snapshot.today.nextItem != null

  Column(
    modifier = GlanceModifier
      .fillMaxSize()
      .padding(12f)
      .clickable(onClick),
    verticalAlignment = Alignment.Top
  ) {
    Text(
      text = "Today's progress",
      style = TextStyle(color = Color(0x8E8E93)),
      modifier = GlanceModifier.padding(bottom = 4f)
    )
    Text(
      text = "$progress%",
      style = TextStyle(fontSize = 28f),
      modifier = GlanceModifier.padding(bottom = 6f)
    )
    Text(text = "▰".repeat(progress / 10) + "▱".repeat(10 - progress / 10))

    Spacer(modifier = GlanceModifier.height(8f))

    when {
      isDone -> {
        Text(text = "Day completed 🎉", style = TextStyle(fontSize = 14f))
        Text(
          text = "Great consistency. Tomorrow we keep the rhythm.",
          style = TextStyle(color = Color(0x8E8E93), fontSize = 11f)
        )
      }
      !hasNext -> {
        Text(text = "No upcoming items", style = TextStyle(fontSize = 14f))
        Text(
          text = "You're free for now.",
          style = TextStyle(color = Color(0x8E8E93), fontSize = 11f)
        )
      }
      else -> {
        val next = snapshot.today.nextItem!!
        next.time?.let { Text(text = it, style = TextStyle(color = Color(0x8E8E93), fontSize = 11f)) }
        Text(text = next.title, style = TextStyle(fontSize = 13f))
      }
    }
  }
}

@androidx.compose.runtime.Composable
private fun MediumContent(snapshot: WidgetSnapshot, onClick: androidx.glance.action.Action) {
  val progress = snapshot.today.progressPercent
  val isDone = progress >= 100
  val hasNext = snapshot.today.nextItem != null
  val streak = snapshot.streak?.current ?: 0
  val weekly = snapshot.weekly

  Row(
    modifier = GlanceModifier
      .fillMaxSize()
      .padding(16f)
      .clickable(onClick),
    verticalAlignment = Alignment.Top
  ) {
    Column(modifier = GlanceModifier.fillMaxWidth()) {
      Text(text = "$progress%", style = TextStyle(fontSize = 24f))
      Spacer(modifier = GlanceModifier.height(6f))
      Text(text = "▰".repeat(progress / 10) + "▱".repeat(10 - progress / 10))
      Spacer(modifier = GlanceModifier.height(8f))

      when {
        isDone -> {
          Text(text = "Day completed 🎉", style = TextStyle(fontSize = 14f))
          Text(
            text = "Great consistency. Tomorrow we keep the rhythm.",
            style = TextStyle(color = Color(0x8E8E93), fontSize = 11f)
          )
        }
        !hasNext -> {
          Text(text = "No upcoming items", style = TextStyle(fontSize = 14f))
          Text(
            text = "You're free for now.",
            style = TextStyle(color = Color(0x8E8E93), fontSize = 11f)
          )
        }
        else -> {
          val next = snapshot.today.nextItem!!
          next.time?.let { Text(text = it, style = TextStyle(color = Color(0x8E8E93), fontSize = 11f)) }
          Text(text = next.title, style = TextStyle(fontSize = 13f))
        }
      }
    }

    if (streak > 0 || weekly != null) {
      Spacer(modifier = GlanceModifier.width(16f))
      Column(modifier = GlanceModifier.fillMaxWidth()) {
        if (streak > 0) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Text(text = "🔥", style = TextStyle(fontSize = 18f))
            Spacer(modifier = GlanceModifier.width(8f))
            Column {
              Text(text = "STREAK", style = TextStyle(color = Color(0x8E8E93), fontSize = 9f))
              Text(text = "$streak days", style = TextStyle(fontSize = 14f))
            }
          }
          Spacer(modifier = GlanceModifier.height(12f))
        }
        weekly?.let { w ->
          Row(verticalAlignment = Alignment.CenterVertically) {
            Text(text = "🎯", style = TextStyle(fontSize = 18f))
            Spacer(modifier = GlanceModifier.width(8f))
            Column {
              Text(text = "WEEKLY GOAL", style = TextStyle(color = Color(0x8E8E93), fontSize = 9f))
              Text(text = "${w.activeDays} / ${w.target} days", style = TextStyle(fontSize = 15f))
              Text(text = "Remaining ${w.remaining}", style = TextStyle(color = Color(0x8E8E93), fontSize = 10f))
            }
          }
        }
      }
    }
  }
}

class RitmoGlanceReceiver : GlanceAppWidgetReceiver() {

  override val glanceAppWidget: GlanceAppWidget = RitmoGlanceWidget()

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == "com.locione.ritmo.RELOAD_WIDGET") {
      glanceAppWidget.updateAll(context)
    }
  }
}
