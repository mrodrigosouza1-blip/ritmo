import Foundation

enum SnapshotReader {
    static let appGroupId = "group.com.locione.ritmo"
    static let fileName = "ritmo_widget_snapshot_v1.json"

    /// Retorna o snapshot ou um fallback vazio.
    static func read() -> WidgetSnapshotModel {
        guard let url = fileURL() else {
            return emptySnapshot()
        }
        guard FileManager.default.fileExists(atPath: url.path) else {
            return emptySnapshot()
        }
        do {
            let data = try Data(contentsOf: url)
            let decoder = JSONDecoder()
            return try decoder.decode(WidgetSnapshotModel.self, from: data)
        } catch {
            return emptySnapshot()
        }
    }

    static func fileURL() -> URL? {
        guard let container = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupId
        ) else {
            return nil
        }
        return container.appendingPathComponent(fileName)
    }

    static func emptySnapshot() -> WidgetSnapshotModel {
        let today = Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateStr = formatter.string(from: today)
        return WidgetSnapshotModel(
            generatedAt: nil,
            locale: "pt",
            today: TodayModel(
                date: dateStr,
                totalItems: 0,
                doneItems: 0,
                progressPercent: 0,
                nextItem: nil
            ),
            streak: StreakModel(current: 0),
            weekly: WeeklyModel(activeDays: 0, target: 7, remaining: 7)
        )
    }
}
