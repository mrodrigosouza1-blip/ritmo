import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct RitmoWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> RitmoEntry {
        RitmoEntry(date: Date(), snapshot: SnapshotReader.emptySnapshot())
    }

    func getSnapshot(in context: Context, completion: @escaping (RitmoEntry) -> Void) {
        let snapshot = SnapshotReader.read()
        completion(RitmoEntry(date: Date(), snapshot: snapshot))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RitmoEntry>) -> Void) {
        let snapshot = SnapshotReader.read()
        let entry = RitmoEntry(date: Date(), snapshot: snapshot)
        let nextDate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextDate))
        completion(timeline)
    }
}

struct RitmoEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshotModel
}

// MARK: - Views

struct RitmoWidgetSmallView: View {
    let entry: RitmoEntry
    let snapshot: WidgetSnapshotModel

    var body: some View {
        let progress = snapshot.today.progressPercent ?? 0
        let isDone = progress >= 100
        let hasNext = snapshot.today.nextItem != nil

        Link(destination: deepLinkURL) {
            VStack(alignment: .leading, spacing: 8) {
                // Progress
                Text("Today's progress")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color(white: 0.56))
                    .textCase(.uppercase)
                Text("\(progress)%")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.primary)
                ProgressView(value: Double(min(100, max(0, progress))) / 100)
                    .progressViewStyle(LinearProgressViewStyle())
                    .tint(Color(red: 0.49, green: 0.30, blue: 1.0))

                Spacer(minLength: 4)

                if isDone {
                    Text("Day completed 🎉")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                    Text("Great consistency. Tomorrow we keep the rhythm.")
                        .font(.system(size: 11))
                        .foregroundColor(Color(white: 0.56))
                        .lineLimit(2)
                } else if !hasNext {
                    Text("No upcoming items")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                    Text("You're free for now.")
                        .font(.system(size: 11))
                        .foregroundColor(Color(white: 0.56))
                        .lineLimit(2)
                } else if let next = snapshot.today.nextItem {
                    HStack(spacing: 6) {
                        if let time = next.time, !time.isEmpty {
                            Text(time)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(Color(white: 0.56))
                        }
                        if let color = next.categoryColor, let uiColor = Color(hex: color) {
                            Circle()
                                .fill(uiColor)
                                .frame(width: 6, height: 6)
                        }
                    }
                    Text(next.title)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .widgetURL(deepLinkURL)
    }

    private var deepLinkURL: URL {
        let date = snapshot.today.date
        return URL(string: "ritmo://today?date=\(date)") ?? URL(string: "ritmo://today")!
    }
}

struct RitmoWidgetMediumView: View {
    let entry: RitmoEntry
    let snapshot: WidgetSnapshotModel

    private var hasWeeklyBars: Bool {
        let bars = snapshot.weeklyBars ?? []
        return bars.count >= 7
    }

    private var isFocusCategory: Bool {
        snapshot.focusCategory != nil && (snapshot.focusCategoryBars?.count ?? 0) >= 7
    }

    var body: some View {
        if isFocusCategory, let focus = snapshot.focusCategory {
            RitmoWidgetMediumFocusView(entry: entry, snapshot: snapshot, focusCategory: focus)
        } else if hasWeeklyBars {
            RitmoWidgetMediumPremiumView(entry: entry, snapshot: snapshot)
        } else {
            RitmoWidgetMediumLegacyView(entry: entry, snapshot: snapshot)
        }
    }
}

// MARK: - Medium Premium (com gráfico semanal)

struct RitmoWidgetMediumPremiumView: View {
    let entry: RitmoEntry
    let snapshot: WidgetSnapshotModel

    private var progress: Int { snapshot.today.progressPercent ?? 0 }
    private var isDone: Bool { progress >= 100 }
    private var hasNext: Bool { snapshot.today.nextItem != nil }
    private var bars: [WeeklyBarModel] { snapshot.weeklyBars ?? [] }
    private var todayStr: String { snapshot.today.date }
    private var locale: String { snapshot.locale ?? "pt" }

    var body: some View {
        Link(destination: deepLinkURL) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .bottom) {
                    Text(localizedToday)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Color(white: 0.56))
                        .textCase(.uppercase)
                    Spacer()
                    Text("\(progress)%")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.primary)
                }
                Text("\(snapshot.today.doneItems)/\(snapshot.today.totalItems) \(localizedDone)")
                    .font(.system(size: 11))
                    .foregroundColor(Color(white: 0.56))

                HStack(alignment: .bottom, spacing: 4) {
                    ForEach(Array(bars.prefix(7).enumerated()), id: \.element.date) { _, bar in
                        WeeklyBarView(
                            percent: bar.percent,
                            isToday: bar.date == todayStr,
                            isNeutral: bar.percent == 0
                        )
                    }
                }
                .frame(height: 28)

                Spacer(minLength: 4)

                if isDone {
                    Text(localizedDayComplete)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                    Text(localizedKeepRhythm)
                        .font(.system(size: 11))
                        .foregroundColor(Color(white: 0.56))
                        .lineLimit(1)
                } else if !hasNext {
                    Text(localizedNoNext)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                } else if let next = snapshot.today.nextItem {
                    HStack(spacing: 6) {
                        if let time = next.time, !time.isEmpty {
                            Text(time)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(Color(white: 0.56))
                        }
                        Text(next.title)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.primary)
                            .lineLimit(1)
                    }
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .widgetURL(deepLinkURL)
    }

    private var deepLinkURL: URL {
        URL(string: "ritmo://today?date=\(snapshot.today.date)") ?? URL(string: "ritmo://today")!
    }

    private var localizedToday: String {
        switch locale.prefix(2) {
        case "pt": return "Hoje"
        case "en": return "Today"
        case "it": return "Oggi"
        default: return "Hoje"
        }
    }

    private var localizedDone: String {
        switch locale.prefix(2) {
        case "pt": return "concluídos"
        case "en": return "done"
        case "it": return "completati"
        default: return "concluídos"
        }
    }

    private var localizedDayComplete: String {
        switch locale.prefix(2) {
        case "pt": return "Dia concluído."
        case "en": return "Day completed."
        case "it": return "Giornata completata."
        default: return "Dia concluído."
        }
    }

    private var localizedKeepRhythm: String {
        switch locale.prefix(2) {
        case "pt": return "Mantém o ritmo."
        case "en": return "Keep the rhythm."
        case "it": return "Mantieni il ritmo."
        default: return "Mantém o ritmo."
        }
    }

    private var localizedNoNext: String {
        switch locale.prefix(2) {
        case "pt": return "Sem próximos itens"
        case "en": return "No upcoming items"
        case "it": return "Nessun prossimo"
        default: return "Sem próximos itens"
        }
    }
}

struct WeeklyBarView: View {
    let percent: Int
    let isToday: Bool
    let isNeutral: Bool

    private let primaryColor = Color(red: 0.49, green: 0.30, blue: 1.0)

    var body: some View {
        GeometryReader { geo in
            let h = isNeutral ? 2 : max(2, CGFloat(percent) / 100 * geo.size.height)
            RoundedRectangle(cornerRadius: 2)
                .fill(isNeutral ? Color(white: 0.85) : primaryColor.opacity(0.6))
                .frame(height: h)
                .overlay(
                    RoundedRectangle(cornerRadius: 2)
                        .stroke(isToday ? primaryColor : Color.clear, lineWidth: 2)
                )
                .frame(maxHeight: .infinity, alignment: .bottom)
        }
    }
}

// MARK: - Medium Focus Category

struct RitmoWidgetMediumFocusView: View {
    let entry: RitmoEntry
    let snapshot: WidgetSnapshotModel
    let focusCategory: FocusCategoryModel

    private var weekly: WeeklyModel? { snapshot.weekly }
    private var bars: [FocusCategoryBarModel] { snapshot.focusCategoryBars ?? [] }
    private var todayStr: String { snapshot.today.date }
    private var locale: String { snapshot.locale ?? "pt" }

    var body: some View {
        Link(destination: deepLinkURL) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    if let c = Color(hex: focusCategory.color_hex) {
                        Circle().fill(c).frame(width: 8, height: 8)
                    }
                    Text(focusCategory.name)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                }

                if let w = weekly {
                    Text("\(localizedMeta): \(w.activeDays)/\(w.target)")
                        .font(.system(size: 11))
                        .foregroundColor(Color(white: 0.56))
                }

                HStack(alignment: .bottom, spacing: 4) {
                    ForEach(Array(bars.prefix(7).enumerated()), id: \.element.date) { i, bar in
                        FocusBarView(
                            hit: bar.hit,
                            isToday: bar.date == todayStr,
                            color: Color(hex: focusCategory.color_hex) ?? primaryColor
                        )
                    }
                }
                .frame(height: 24)

                Spacer(minLength: 4)

                if let next = snapshot.today.nextItem {
                    Text(next.title)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .widgetURL(deepLinkURL)
    }

    private var primaryColor: Color { Color(red: 0.49, green: 0.30, blue: 1.0) }

    private var deepLinkURL: URL {
        URL(string: "ritmo://today?date=\(snapshot.today.date)") ?? URL(string: "ritmo://today")!
    }

    private var localizedMeta: String {
        switch locale.prefix(2) {
        case "pt": return "Meta semanal"
        case "en": return "Weekly goal"
        case "it": return "Obiettivo settimanale"
        default: return "Meta semanal"
        }
    }
}

struct FocusBarView: View {
    let hit: Bool
    let isToday: Bool
    let color: Color

    var body: some View {
        GeometryReader { geo in
            let h: CGFloat = hit ? geo.size.height : 2
            RoundedRectangle(cornerRadius: 2)
                .fill(hit ? color : Color(white: 0.85))
                .frame(height: h)
                .overlay(
                    RoundedRectangle(cornerRadius: 2)
                        .stroke(isToday ? color : Color.clear, lineWidth: 2)
                )
                .frame(maxHeight: .infinity, alignment: .bottom)
        }
    }
}

// MARK: - Medium Legacy (fallback sem weeklyBars)

struct RitmoWidgetMediumLegacyView: View {
    let entry: RitmoEntry
    let snapshot: WidgetSnapshotModel

    var body: some View {
        let progress = snapshot.today.progressPercent ?? 0
        let isDone = progress >= 100
        let hasNext = snapshot.today.nextItem != nil
        let streak = snapshot.streak?.current ?? 0
        let weekly = snapshot.weekly

        Link(destination: deepLinkURL) {
            HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("\(progress)%")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.primary)
                    ProgressView(value: Double(min(100, max(0, progress))) / 100)
                        .progressViewStyle(LinearProgressViewStyle())
                        .tint(Color(red: 0.49, green: 0.30, blue: 1.0))

                    Spacer(minLength: 4)

                    if isDone {
                        Text("Day completed 🎉")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.primary)
                        Text("Great consistency. Tomorrow we keep the rhythm.")
                            .font(.system(size: 11))
                            .foregroundColor(Color(white: 0.56))
                            .lineLimit(2)
                    } else if !hasNext {
                        Text("No upcoming items")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.primary)
                        Text("You're free for now.")
                            .font(.system(size: 11))
                            .foregroundColor(Color(white: 0.56))
                            .lineLimit(2)
                    } else if let next = snapshot.today.nextItem {
                        if let time = next.time, !time.isEmpty {
                            Text(time)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(Color(white: 0.56))
                        }
                        Text(next.title)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.primary)
                            .lineLimit(1)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                VStack(alignment: .trailing, spacing: 12) {
                    if streak > 0 {
                        HStack(spacing: 8) {
                            Text("🔥")
                                .font(.system(size: 18))
                            VStack(alignment: .leading, spacing: 2) {
                                Text("STREAK")
                                    .font(.system(size: 9, weight: .medium))
                                    .foregroundColor(Color(white: 0.56))
                                    .textCase(.uppercase)
                                Text("\(streak) days")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.primary)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    if let w = weekly {
                        HStack(spacing: 8) {
                            Text("🎯")
                                .font(.system(size: 18))
                            VStack(alignment: .leading, spacing: 2) {
                                Text("WEEKLY GOAL")
                                    .font(.system(size: 9, weight: .medium))
                                    .foregroundColor(Color(white: 0.56))
                                    .textCase(.uppercase)
                                Text("\(w.activeDays) / \(w.target) days")
                                    .font(.system(size: 15, weight: .heavy))
                                    .foregroundColor(.primary)
                                Text("Remaining \(w.remaining)")
                                    .font(.system(size: 10))
                                    .foregroundColor(Color(white: 0.56))
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .frame(width: 140, alignment: .trailing)
            }
            .padding(16)
        }
        .widgetURL(deepLinkURL)
    }

    private var deepLinkURL: URL {
        let date = snapshot.today.date
        return URL(string: "ritmo://today?date=\(date)") ?? URL(string: "ritmo://today")!
    }
}

// MARK: - Color hex extension

extension Color {
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }
        let r = Double((rgb & 0xFF0000) >> 16) / 255
        let g = Double((rgb & 0x00FF00) >> 8) / 255
        let b = Double(rgb & 0x0000FF) / 255
        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Widget

@main
struct RitmoWidget: Widget {
    let kind: String = "RitmoWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RitmoWidgetProvider()) { entry in
            RitmoWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Ritmo")
        .description("Progresso do dia e metas")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct RitmoWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: RitmoEntry

    var body: some View {
        switch family {
        case .systemSmall:
            RitmoWidgetSmallView(entry: entry, snapshot: entry.snapshot)
        case .systemMedium:
            RitmoWidgetMediumView(entry: entry, snapshot: entry.snapshot)
        default:
            RitmoWidgetSmallView(entry: entry, snapshot: entry.snapshot)
        }
    }
}
