package com.locione.ritmo

import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class WidgetSnapshot(
  val today: Today,
  val streak: Streak?,
  val weekly: Weekly?
) {
  companion object {
    fun fromJson(json: String): WidgetSnapshot? {
      return try {
        val obj = JSONObject(json)
        val todayObj = obj.getJSONObject("today")
        val today = Today(
          date = todayObj.optString("date", ""),
          totalItems = todayObj.optInt("totalItems", 0),
          doneItems = todayObj.optInt("doneItems", 0),
          progressPercent = todayObj.optInt("progressPercent", 0),
          nextItem = todayObj.optJSONObject("nextItem")?.let { n ->
            NextItem(
              type = n.optString("type"),
              title = n.optString("title", ""),
              time = n.optString("time"),
              date = n.optString("date", ""),
              categoryColor = n.optString("categoryColor")
            )
          }
        )
        val streak = obj.optJSONObject("streak")?.let { s ->
          Streak(current = s.optInt("current", 0))
        }
        val weekly = obj.optJSONObject("weekly")?.let { w ->
          Weekly(
            activeDays = w.optInt("activeDays", 0),
            target = w.optInt("target", 7),
            remaining = w.optInt("remaining", 7)
          )
        }
        WidgetSnapshot(today = today, streak = streak, weekly = weekly)
      } catch (e: Exception) {
        null
      }
    }

    fun empty(): WidgetSnapshot {
      val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
      return WidgetSnapshot(
        today = Today(today, 0, 0, 0, null),
        streak = Streak(0),
        weekly = Weekly(0, 7, 7)
      )
    }
  }
}

data class Today(
  val date: String,
  val totalItems: Int,
  val doneItems: Int,
  val progressPercent: Int,
  val nextItem: NextItem?
)

data class NextItem(
  val type: String?,
  val title: String,
  val time: String?,
  val date: String,
  val categoryColor: String?
)

data class Streak(val current: Int)
data class Weekly(val activeDays: Int, val target: Int, val remaining: Int)
