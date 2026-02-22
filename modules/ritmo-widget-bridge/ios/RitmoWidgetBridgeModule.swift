import ExpoModulesCore
import WidgetKit

let appGroupId = "group.com.locione.ritmo"
let snapshotFileName = "ritmo_widget_snapshot_v1.json"

public class RitmoWidgetBridgeModule: Module {
    public func definition() -> ModuleDefinition {
        Name("RitmoWidgetBridge")

        Function("getAppGroupPath") { () -> String in
            guard let container = FileManager.default.containerURL(
                forSecurityApplicationGroupIdentifier: appGroupId
            ) else {
                return ""
            }
            return container.path
        }

        AsyncFunction("reloadWidgets") {
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }
        }

        AsyncFunction("writeSnapshotAndReload") { (json: String) in
            guard let container = FileManager.default.containerURL(
                forSecurityApplicationGroupIdentifier: appGroupId
            ) else {
                throw NSError(domain: "RitmoWidgetBridge", code: -1, userInfo: [
                    NSLocalizedDescriptionKey: "App Group container not found"
                ])
            }
            let fileURL = container.appendingPathComponent(snapshotFileName)
            do {
                try json.write(to: fileURL, atomically: true, encoding: .utf8)
            } catch {
                throw NSError(domain: "RitmoWidgetBridge", code: -2, userInfo: [
                    NSLocalizedDescriptionKey: "Failed to write snapshot: \(error.localizedDescription)"
                ])
            }
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }
        }
    }
}
