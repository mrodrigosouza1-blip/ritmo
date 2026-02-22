# i18n Guard

Script de checagem automática para evitar regressão da internacionalização. Detecta strings hardcoded em telas e componentes que deveriam usar `t()`.

## Como rodar

```bash
pnpm run i18n:guard
# ou
npm run i18n:guard
```

- **Exit 0**: Nenhuma string hardcoded detectada
- **Exit 1**: Ocorrências encontradas (com relatório no terminal)

## Como corrigir

Quando o guard reportar uma ocorrência, substitua o texto fixo por uma chave i18n:

### Exemplo 1: Texto direto em `<Text>`

**Antes:**
```tsx
<Text>Bem-vindo ao Ritmo</Text>
```

**Depois:**
```tsx
<Text>{t('onboarding.welcome')}</Text>
```

Adicione a chave em `src/i18n/locales/pt.ts`, `en.ts` e `it.ts`:
```ts
'onboarding.welcome': 'Bem-vindo ao Ritmo',  // pt
'onboarding.welcome': 'Welcome to Ritmo',     // en
'onboarding.welcome': 'Benvenuto in Ritmo',  // it
```

### Exemplo 2: Props com strings

**Antes:**
```tsx
<TextInput placeholder="Digite o título" />
```

**Depois:**
```tsx
<TextInput placeholder={t('form.titlePlaceholder')} />
```

### Exemplo 3: Alert.alert

**Antes:**
```tsx
Alert.alert('Erro', 'Não foi possível salvar.');
```

**Depois:**
```tsx
Alert.alert(t('form.error'), t('form.errorSave'));
```

### Exemplo 4: Título de tela/opções

**Antes:**
```tsx
<Stack.Screen options={{ title: 'Configurações' }} />
```

**Depois:**
```tsx
<Stack.Screen options={{ title: t('settings.title') }} />
```

## O que o guard detecta

- Conteúdo direto entre `<Text>...</Text>`
- Props: `title`, `label`, `placeholder`, `headerTitle`, `message`, `text`
- `Alert.alert("...", "...")`
- `options={{ title: "..." }}`

## O que o guard ignora

- Strings dentro de `t("...")` ou `t('...')`
- Placeholders técnicos: `HH:mm`, `AAAA-MM-DD`, `09:00`
- Emails e URLs
- IDs, UUIDs
- Strings SQL
- Logs técnicos

## Validação manual

Para conferir que o guard funciona:

1. Insira propositalmente `<Text>Teste</Text>` em qualquer tela
2. Rode `pnpm run i18n:guard` → deve falhar (exit 1) e listar a ocorrência
3. Remova o teste e rode novamente → deve passar (exit 0)
