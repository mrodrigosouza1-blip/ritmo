#!/usr/bin/env node
/**
 * i18n Guard - Detecta strings hardcoded que deveriam usar t()
 * Uso: node scripts/i18n-guard.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const GLOB_PATTERNS = [
  'app/**/*.tsx',
  'src/**/*.tsx',
  'src/**/*.ts',
];

const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.expo', '.git'];
const EXCLUDE_PATH_PARTS = ['src/i18n/locales', 'i18n/locales'];

/** Checa se o path deve ser ignorado */
function shouldExclude(filePath) {
  const relative = path.relative(ROOT, filePath);
  if (EXCLUDE_DIRS.some((d) => relative.includes(d))) return true;
  if (EXCLUDE_PATH_PARTS.some((p) => relative.includes(p))) return true;
  return false;
}

/** Lista arquivos que batem com os patterns */
function collectFiles() {
  const files = [];
  function walk(dir, patternParts) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!EXCLUDE_DIRS.includes(e.name)) walk(full, patternParts.slice(1));
      } else if (
        e.isFile() &&
        (e.name.endsWith('.tsx') || e.name.endsWith('.ts'))
      ) {
        const rel = path.relative(ROOT, full);
        if (rel.startsWith('app/') || rel.startsWith('src/')) {
          if (!shouldExclude(full)) files.push(full);
        }
      }
    }
  }
  walk(path.join(ROOT, 'app'), ['app']);
  walk(path.join(ROOT, 'src'), ['src']);
  return files;
}

/** Verifica se string parece ser key i18n (ex: "form.save") */
function looksLikeI18nKey(s) {
  return /^[a-z][a-z0-9._]*$/.test(s.trim());
}

/** Verifica se é apenas números/UUID/ID */
function looksLikeId(s) {
  return (
    /^[0-9a-fA-F-]{8,}$/.test(s) ||
    /^[a-z]+-[a-z0-9-]+$/.test(s) ||
    /^\d+$/.test(s)
  );
}

/** Verifica se parece SQL */
function looksLikeSql(s) {
  return /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|INTO)\b/i.test(s);
}

/** Verifica se é log técnico */
function looksLikeLog(s) {
  return /^(Error|Warning|Debug|\[.*\])/.test(s) || s.includes('__DEV__');
}

/** Placeholders técnicos (formatos de data/hora) */
function looksLikeFormatPlaceholder(s) {
  return /^(HH:mm|hh:mm|AAAA-MM-DD|DD\/MM|MM\/DD|\d{2}:\d{2})$/i.test(s.trim());
}

/** Email ou URL */
function looksLikeEmailOrUrl(s) {
  return /^[\w.-]+@[\w.-]+\.\w+$/.test(s) || s.startsWith('http');
}

/** Extrai trechos de string entre aspas (simplificado) */
function extractQuotedStrings(line) {
  const matches = [];
  const re = /["']([^"']{2,})["']/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    matches.push({ value: m[1], index: m.index });
  }
  return matches;
}

/** Checa se a linha tem t(" ou t(' antes do trecho (evita keys em t()) */
function isInsideTCall(line, matchIndex) {
  const before = line.substring(0, matchIndex);
  const lastT = before.lastIndexOf('t(');
  const lastClose = before.lastIndexOf(')');
  if (lastT > lastClose) return true;
  const lastTemplate = before.lastIndexOf('`');
  if (lastTemplate > 0 && before.includes('t(`')) return true;
  return false;
}

const SUSPICIOUS_PROPS = [
  'title',
  'label',
  'placeholder',
  'headerTitle',
  'message',
  'text',
];

/** Detecta padrões suspeitos numa linha */
function scanLine(line, lineNum, filePath) {
  const rel = path.relative(ROOT, filePath);
  const findings = [];

  // 1) <Text>texto com letras</Text> - conteúdo direto entre tags (não {t()})
  const textContentMatch = line.match(
    />\s*([^<{]+[A-Za-zÀ-ÿ][^<{]*?)\s*<\s*\/\s*Text/
  );
  if (textContentMatch) {
    const content = textContentMatch[1].trim();
    // Ignorar se começa com { (é JSX expression tipo {t('key')})
    if (
      content.length >= 2 &&
      !content.startsWith('{') &&
      !looksLikeI18nKey(content) &&
      !looksLikeId(content)
    ) {
      findings.push({
        line: lineNum,
        snippet: `>${content}<`,
        hint: 'Use t("...")',
      });
    }
  }

  // 2) Props com strings: title="...", label="...", placeholder="..."
  for (const prop of SUSPICIOUS_PROPS) {
    const propRe = new RegExp(
      `\\b${prop}\\b\\s*=\\s*["']([^"']{2,})["']`,
      'g'
    );
    let m;
    while ((m = propRe.exec(line)) !== null) {
      const value = m[1];
      if (isInsideTCall(line, m.index)) continue;
      if (looksLikeI18nKey(value)) continue;
      if (looksLikeId(value)) continue;
      if (looksLikeSql(value)) continue;
      if (looksLikeLog(value)) continue;
      if (prop === 'placeholder' && looksLikeFormatPlaceholder(value)) continue;
      if (looksLikeEmailOrUrl(value)) continue;
      findings.push({
        line: lineNum,
        snippet: `${prop}="${value}"`,
        hint: `Use ${prop}={t("...")}`,
      });
    }
  }

  // 3) options={{ title: '...' }} ou screenOptions title
  const optionsTitleMatch = line.match(/title\s*:\s*["']([^"']{2,})["']/);
  if (optionsTitleMatch) {
    const value = optionsTitleMatch[1];
    if (
      value &&
      !looksLikeI18nKey(value) &&
      !looksLikeId(value) &&
      !isInsideTCall(line, line.indexOf(value))
    ) {
      findings.push({
        line: lineNum,
        snippet: `title: "${value}"`,
        hint: 'Use title: t("...")',
      });
    }
  }

  // 4) Alert.alert("...", "...")
  const alertMatch = line.match(
    /Alert\.alert\s*\(\s*["']([^"']+)["']\s*[,)]/
  );
  if (alertMatch) {
    const firstArg = alertMatch[1];
    if (!looksLikeI18nKey(firstArg) && !looksLikeId(firstArg)) {
      findings.push({
        line: lineNum,
        snippet: `Alert.alert("${firstArg}"...)`,
        hint: 'Use Alert.alert(t("..."), t("..."))',
      });
    }
  }

  return findings;
}

function main() {
  const files = collectFiles();
  const allFindings = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const findings = scanLine(lines[i], i + 1, file);
      for (const f of findings) {
        allFindings.push({
          file: path.relative(ROOT, file),
          ...f,
        });
      }
    }
  }

  // Relatório
  if (allFindings.length > 0) {
    console.log('\n⚠️  i18n Guard: strings hardcoded detectadas\n');
    for (const f of allFindings) {
      console.log(`${f.file}:${f.line} -> ${f.snippet}`);
      console.log(`   Sugestão: ${f.hint}\n`);
    }
    console.log(`Total: ${allFindings.length} ocorrência(s)\n`);
    process.exit(1);
  } else {
    console.log('✅ i18n Guard: nenhuma string hardcoded detectada.');
    process.exit(0);
  }
}

main();
