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

    var body: some View {
        let progress = snapshot.today.progressPercent ?? 0
        let isDone = progress >= 100
        let hasNext = snapshot.today.nextItem != nil
        let streak = snapshot.streak?.current ?? 0
        let weekly = snapshot.weekly

        Link(destination: deepLinkURL) {
            HStack(alignment: .top, spacing: 16) {
                // Left column
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

                // Right column
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
