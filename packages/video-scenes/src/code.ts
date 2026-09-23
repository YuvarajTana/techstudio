import type { CodeLanguage } from "@teckstudio/lesson-video";

export type TokenKind = "plain" | "keyword" | "string" | "comment" | "number" | "function";
export interface Token {
  text: string;
  kind: TokenKind;
}

const KEYWORDS: Record<CodeLanguage, string[]> = {
  python: ["def", "return", "if", "elif", "else", "for", "while", "in", "not", "and", "or", "import", "from", "as", "class", "with", "try", "except", "finally", "lambda", "yield", "async", "await", "None", "True", "False", "pass", "raise"],
  javascript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "of", "in", "new", "class", "extends", "import", "from", "export", "default", "async", "await", "try", "catch", "throw", "null", "undefined", "true", "false", "this"],
  typescript: ["const", "let", "function", "return", "if", "else", "for", "while", "of", "in", "new", "class", "extends", "implements", "interface", "type", "import", "from", "export", "default", "async", "await", "try", "catch", "throw", "null", "undefined", "true", "false", "this", "readonly", "as"],
  sql: ["select", "from", "where", "join", "left", "right", "inner", "outer", "on", "group", "by", "order", "having", "insert", "into", "values", "update", "set", "delete", "create", "table", "index", "primary", "key", "and", "or", "not", "null", "as", "limit", "distinct", "count"],
  bash: ["if", "then", "else", "fi", "for", "do", "done", "while", "case", "esac", "function", "export", "echo", "cd", "sudo"],
  json: ["true", "false", "null"],
  text: [],
};

const COMMENT: Record<CodeLanguage, RegExp | null> = {
  python: /#.*/y,
  bash: /#.*/y,
  javascript: /\/\/.*/y,
  typescript: /\/\/.*/y,
  sql: /--.*/y,
  json: null,
  text: null,
};

/** Tiny single-line tokenizer: enough for teaching snippets, no dependency. */
export function tokenizeLine(line: string, language: CodeLanguage): Token[] {
  if (language === "text") return [{ text: line, kind: "plain" }];
  const keywords = new Set(language === "sql" ? KEYWORDS.sql : KEYWORDS[language]);
  const tokens: Token[] = [];
  let i = 0;
  const push = (text: string, kind: TokenKind) => {
    const last = tokens[tokens.length - 1];
    if (last && last.kind === kind && kind === "plain") last.text += text;
    else tokens.push({ text, kind });
  };
  while (i < line.length) {
    const comment = COMMENT[language];
    if (comment) {
      comment.lastIndex = i;
      const match = comment.exec(line);
      if (match) {
        push(match[0], "comment");
        break;
      }
    }
    const ch = line[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < line.length && line[j] !== ch) j += line[j] === "\\" ? 2 : 1;
      push(line.slice(i, j + 1), "string");
      i = j + 1;
      continue;
    }
    const number = /\d+(\.\d+)?/y;
    number.lastIndex = i;
    const n = number.exec(line);
    if (n && (i === 0 || !/[A-Za-z_]/.test(line[i - 1]))) {
      push(n[0], "number");
      i += n[0].length;
      continue;
    }
    const word = /[A-Za-z_][A-Za-z0-9_]*/y;
    word.lastIndex = i;
    const w = word.exec(line);
    if (w) {
      const text = w[0];
      const isKeyword = keywords.has(language === "sql" ? text.toLowerCase() : text);
      const isCall = line[i + text.length] === "(";
      push(text, isKeyword ? "keyword" : isCall ? "function" : "plain");
      i += text.length;
      continue;
    }
    push(ch, "plain");
    i += 1;
  }
  return tokens;
}

export const TOKEN_COLORS: Record<TokenKind, string> = {
  plain: "#e2e8f0",
  keyword: "#c084fc",
  string: "#86efac",
  comment: "#64748b",
  number: "#fbbf24",
  function: "#7dd3fc",
};
