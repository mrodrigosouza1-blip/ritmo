# Validação de build iOS (widget + EAS)

## IMPORTANTE: EAS e prebuild

O EAS **não roda prebuild** se a pasta `ios/` existir no projeto enviado. Os plugins (`withDisableBundleSigning`, `withRitmoWidgetXcode`) só rodam durante o prebuild. Por isso:

- **ios/** está em `.gitignore` e `.easignore` — o EAS sempre executa prebuild e aplica os plugins
- Não commite `ios/` — use `npx expo prebuild` localmente para gerar quando precisar

## Pré-requisitos

Apple Team ID em **app.json** (`expo.ios.appleTeamId`) ou variável `APPLE_TEAM_ID` (EAS Secrets).

## Checklist local (antes de subir)

```bash
# 1. Prebuild limpo
npx expo prebuild --platform ios --clean

# 2. Verificar patch no Podfile
grep -A 2 "## \[Ritmo\] Disable code signing" ios/Podfile

# 3. Verificar RitmoWidget no project.pbxproj
grep -E "DEVELOPMENT_TEAM|CODE_SIGN_STYLE" ios/*.xcodeproj/project.pbxproj | head -20

# 4. (Opcional) pod install para build local
cd ios && LANG=en_US.UTF-8 pod install && cd ..
```

## Checklist EAS

```bash
# Build com cache limpo (recomendado na primeira vez após as mudanças)
eas build -p ios --profile production --clear-cache

# Build normal
eas build -p ios --profile production
```

## Como ver logs completos do build (Xcode logs)

O EAS **não possui** comando tipo `eas build:download --logs`. Os logs ficam no dashboard:

1. **expo.dev** → seu projeto → **Builds**
2. Clique no build (sucesso ou falha)
3. Expanda as fases: **Install dependencies**, **Run prebuild**, **Configure project**, **Install CocoaPods**, **Run Xcode build**
4. O erro de resource bundle normalmente aparece em **Run Xcode build**
5. Use o ícone de download (ou "Copy") para salvar o log completo da fase que falhou

Para builds locais com logs persistentes:

```bash
EAS_LOCAL_BUILD_SKIP_CLEANUP=1 eas build -p ios --profile production --local --wait
# Logs ficam no diretório temporário (não é deletado)
```

## Ordem dos config plugins

```
withRitmoWidgetNative  → copia arquivos + withRitmoWidgetXcode (DEVELOPMENT_TEAM no RitmoWidget)
withDisableBundleSigning → patch no Podfile (resource bundles)
expo-router
@react-native-community/datetimepicker
```

## Resumo signing

| Target           | DEVELOPMENT_TEAM | CODE_SIGN_STYLE |
|------------------|------------------|-----------------|
| Ritmo (main)     | (EAS)            | (herdado)       |
| RitmoWidget      | appleTeamId      | Automatic       |
| Resource bundles | N/A (não assinam)| CODE_SIGNING_ALLOWED=NO |
