import Foundation

/// Modelo do snapshot JSON para o widget (v2). Retrocompatível: weeklyBars opcional.
struct WidgetSnapshotModel: Codable {
    let generatedAt: String?
    let locale: String?
    let today: TodayModel
    let streak: StreakModel?
    let weekly: WeeklyModel?
    let weeklyBars: [WeeklyBarModel]?
    let weeklyBestStreak: Int?
    let focusCategory: FocusCategoryModel?
    let focusCategoryBars: [FocusCategoryBarModel]?
}

struct TodayModel: Codable {
    let date: String
    let totalItems: Int
    let doneItems: Int
    let progressPercent: Int?
    let nextItem: NextItemModel?
}

struct NextItemModel: Codable {
    let type: String?
    let title: String
    let time: String?
    let date: String
    let categoryColor: String?
}

struct StreakModel: Codable {
    let current: Int
}

struct WeeklyModel: Codable {
    let activeDays: Int
    let target: Int
    let remaining: Int
}

struct WeeklyBarModel: Codable {
    let date: String
    let percent: Int
}

struct FocusCategoryModel: Codable {
    let id: String
    let name: String
    let color_hex: String
}

struct FocusCategoryBarModel: Codable {
    let date: String
    let doneCount: Int
    let targetCount: Int
    let hit: Bool
}
