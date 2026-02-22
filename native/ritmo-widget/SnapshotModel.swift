import Foundation

/// Modelo do snapshot JSON para o widget. Deve corresponder a WidgetSnapshot no RN.
struct WidgetSnapshotModel: Codable {
    let generatedAt: String?
    let locale: String?
    let today: TodayModel
    let streak: StreakModel?
    let weekly: WeeklyModel?
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
