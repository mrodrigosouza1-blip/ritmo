# Validação de build iOS (widget + EAS)

Use este checklist antes de subir o build para o EAS.

## Pré-requisitos

Configure o Apple Team ID de uma das formas:

1. **app.json**: adicione em `expo.ios`:
   ```json
   "appleTeamId": "SUA_TEAM_ID_AQUI"
   ```

2. **Variável de ambiente** (para EAS, use Secrets em eas.expo.dev):
   ```bash
   export APPLE_TEAM_ID="SUA_TEAM_ID_AQUI"
   ```
   No EAS: Project → Secrets → `APPLE_TEAM_ID`

## Comandos de validação

### 1. Prebuild limpo

```bash
# Com Team ID configurado (app.json ou APPLE_TEAM_ID no ambiente)
npx expo prebuild --platform ios --clean
```

Deve completar sem erros. Se falhar com mensagem sobre Apple Team ID, configure conforme pré-requisitos acima.

### 2. Verificar signing do RitmoWidget no project.pbxproj

O nome do `.xcodeproj` pode ser `Ritmo RotinaeMetas` (baseado no app name). Verifique:

```bash
# Encontrar o project.pbxproj
ls ios/*.xcodeproj/project.pbxproj

# Verificar DEVELOPMENT_TEAM e CODE_SIGN_STYLE no target RitmoWidget
grep -E "DEVELOPMENT_TEAM|CODE_SIGN_STYLE" ios/*.xcodeproj/project.pbxproj | head -20
```

Devem aparecer para Debug e Release:
```
CODE_SIGN_STYLE = "Automatic";
DEVELOPMENT_TEAM = "SUA_TEAM_ID";
```

### 3. Pod install (opcional, para build local)

```bash
cd ios
LANG=en_US.UTF-8 pod install
cd ..
```

### 4. Build EAS

```bash
eas build -p ios --profile production
```

## Resumo das configurações de signing

| Target        | DEVELOPMENT_TEAM | CODE_SIGN_STYLE | CODE_SIGN_ENTITLEMENTS       |
|---------------|------------------|-----------------|------------------------------|
| Ritmo (main)  | (herdado/EAS)    | (herdado)       | Ritmo/Ritmo.entitlements     |
| RitmoWidget   | appleTeamId      | Automatic       | RitmoWidget/RitmoWidget.entitlements |

Os resource bundles continuam com `CODE_SIGNING_ALLOWED = NO` via plugin `withDisableBundleSigning`.
