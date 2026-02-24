# Ritmo Widget (WidgetKit nativo)

Widget iOS que lê `ritmo_widget_snapshot_v1.json` do App Group e exibe progresso do dia, streak e meta semanal.

## Setup manual (após `expo prebuild`)

1. Abra `ios/Ritmo.xcworkspace` no Xcode
2. **File → New → Target → Widget Extension**
   - Nome: `RitmoWidget`
   - Bundle ID: `com.locione.ritmo.widget`
   - Desmarque "Include Configuration Intent"
3. **Capabilities** do target RitmoWidget:
   - App Groups → habilitar
   - Adicionar `group.com.locione.ritmo.shared`
4. **Substituir** os arquivos gerados pelos deste diretório:
   - Copie `SnapshotModel.swift`, `SnapshotReader.swift`, `RitmoWidget.swift` para o grupo RitmoWidget no Xcode
   - Remova o `RitmoWidget.swift` gerado e adicione nossos arquivos
   - Ou: delete o RitmoWidgetEntryView/RitmoWidget provisório e cole o conteúdo de RitmoWidget.swift
5. **Info.plist** do widget: garantir NSExtension com NSExtensionPointIdentifier = com.apple.widgetkit-extension
6. Build e run

## Deep links

- `ritmo://today`
- `ritmo://today?date=YYYY-MM-DD`
- `ritmo://week`
- `ritmo://month`

## App Group

- ID: `group.com.locione.ritmo.shared`
- Arquivo: `ritmo_widget_snapshot_v1.json`
