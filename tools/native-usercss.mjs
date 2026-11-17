import postcss from "postcss";
import { entryPage, packageFiles } from "./scrapbox-package.mjs";

export const styleStart = "/* kame-layout:usercss:start */";
export const styleEnd = "/* kame-layout:usercss:end */";
export const inlineVersionProperty = "--kame-layout-inline-version";
const textLines = (page) => page.lines.map((line) => (typeof line === "string" ? line : line.text));

export function compileNativeStyle(pkg) {
  const files = packageFiles(pkg);
  const version = files.get(`${entryPage}/loader.js`)?.match(/const version = "([a-f0-9]{64})"/)[1];
  if (!version) throw new Error("Missing delivery revision for native UserCSS.");
  const tree = postcss.parse(files.get(`${entryPage}/style.css`));
  tree.walkAtRules("import", (rule) => {
    const relative = rule.params.match(/^["'](\.\/[^"']+)["']$/)?.[1];
    if (!relative) return;
    const filename = relative.slice(2).split("?")[0],
      body = files.get(`${entryPage}/${filename}`);
    if (body === undefined) throw new Error("Unresolved native stylesheet dependency.");
    rule.replaceWith(...postcss.parse(body).nodes);
  });
  // The only external CSS import is Google's font-face sheet. CSS imports must
  // precede declarations once the per-feature sheets have been combined.
  const fonts = [];
  tree.walkAtRules("import", (rule) => {
    if (!/^url\(["']https:\/\/fonts\.googleapis\.com\//.test(rule.params))
      throw new Error("Unsupported external import in native stylesheet.");
    fonts.push(rule.clone());
    rule.remove();
  });
  tree.prepend(...fonts);
  tree.append(postcss.parse(`:root { ${inlineVersionProperty}: "${version}"; }`).nodes);
  return { version, css: tree.toString() };
}

export function mergeNativeStyle(page, target, sourceProject, css) {
  if (page.title !== target.page || target.page !== "Settings" || !Array.isArray(page.lines))
    throw new Error("Invalid native UserCSS target.");
  const lines = textLines(page);
  if (lines[0] !== page.title || lines.some((line) => typeof line !== "string"))
    throw new Error("Invalid native UserCSS page content.");
  const starts = lines.flatMap((line, index) => (line === "code:style.css" ? [index] : []));
  if (starts.length !== 1) throw new Error("Expected exactly one native style.css block.");
  const start = starts[0] + 1;
  let end = start;
  while (end < lines.length && /^[ \t]/.test(lines[end])) end++;
  const rows = lines.slice(start, end);
  const strip = (line) => line.replace(/^[ \t]/, "");
  const from = rows.flatMap((line, index) => (strip(line).trim() === styleStart ? [index] : []));
  const to = rows.flatMap((line, index) => (strip(line).trim() === styleEnd ? [index] : []));
  let first, last;
  if (from.length || to.length) {
    if (from.length !== 1 || to.length !== 1 || from[0] >= to[0])
      throw new Error("Malformed managed UserCSS markers.");
    first = from[0];
    last = to[0];
  } else {
    const imports = rows.flatMap((line, index) => {
      const match = strip(line)
        .trim()
        .match(/^@import\s+(?:url\(\s*)?["']([^"']+)["']\s*\)?\s*;$/);
      if (!match) return [];
      const url = new URL(match[1], "https://scrapbox.io");
      return url.origin === "https://scrapbox.io" &&
        decodeURIComponent(url.pathname) === `/api/code/${sourceProject}/${entryPage}/style.css`
        ? [index]
        : [];
    });
    if (imports.length !== 1) throw new Error("Refusing to replace unrecognised native UserCSS.");
    first = last = imports[0];
  }
  const managed = [styleStart, ...css.split("\n"), styleEnd].map((line) => " " + line);
  const result = [...lines.slice(0, start + first), ...managed, ...lines.slice(start + last + 1)];
  if (result.length >= 10000) throw new Error("Native UserCSS page exceeds the page line limit.");
  if (result.some((line) => typeof line !== "string" || /[\r\n\u2028\u2029]/.test(line)))
    throw new Error("Invalid native UserCSS lines.");
  return { title: page.title, lines: result };
}

export function managedStyleFromCode(code) {
  const start = code.indexOf(styleStart),
    end = code.indexOf(styleEnd);
  if (start < 0 || end < start) throw new Error("Missing published native UserCSS markers.");
  return code.slice(start + styleStart.length, end).trim();
}
