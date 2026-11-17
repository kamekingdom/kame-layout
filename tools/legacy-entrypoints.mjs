import crypto from "node:crypto";
import { compileNativeStyle } from "./native-usercss.mjs";
import { entryPage } from "./scrapbox-package.mjs";

// Exact original blocks, also present in the immutable initial commit.
const originals = {
  Settings: "bf941ac9a84627a329989e8b37c8c3658cb51337cf8aa72458713a89c123b465",
  kame: "88895955cea1fd19c657e9f062693dfc5da921695503f444b056e186b87d0c3f",
};
export function legacyEntrypoints(pkg, project) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(project)) throw new Error("Invalid legacy source project.");
  const { css, version } = compileNativeStyle(pkg);
  return [
    { page: "Settings", block: "style.css", source: css, prefix: "/*", suffix: " */", kind: "css" },
    {
      page: "kame",
      block: "script.js",
      source: `import "/api/code/${project}/${encodeURIComponent(entryPage)}/script.js?v=${version}";`,
      prefix: "//",
      suffix: "",
      kind: "js",
    },
  ].map((entry) => {
    const start = `${entry.prefix} kame-layout:legacy-${entry.kind}:start${entry.suffix}`;
    const end = `${entry.prefix} kame-layout:legacy-${entry.kind}:end${entry.suffix}`;
    return { ...entry, start, end, version, code: `${start}\n${entry.source}\n${end}\n` };
  });
}
export function legacyCodeRange(lines, entry) {
  const headers = lines.flatMap((line, i) => (line === `code:${entry.block}` ? [i] : []));
  if (headers.length !== 1) throw new Error(`Expected one ${entry.page}/${entry.block} block.`);
  const start = headers[0] + 1;
  let end = start;
  while (end < lines.length && /^[ \t]/.test(lines[end])) end++;
  return { start, end };
}
export function managedLegacyCode(code, entry) {
  const rows = code.split("\n");
  const from = rows.flatMap((line, i) => (line.trim() === entry.start ? [i] : []));
  const to = rows.flatMap((line, i) => (line.trim() === entry.end ? [i] : []));
  if (from.length !== 1 || to.length !== 1 || from[0] >= to[0])
    throw new Error(`Malformed legacy markers: ${entry.page}/${entry.block}.`);
  return { first: from[0], last: to[0], code: rows.slice(from[0], to[0] + 1).join("\n") };
}
export function mergeLegacyEntrypoint(page, entry) {
  if (page.title !== entry.page || !Array.isArray(page.lines))
    throw new Error("Invalid legacy page.");
  const lines = page.lines.map((line) => (typeof line === "string" ? line : line.text));
  if (lines[0] !== entry.page || lines.some((line) => typeof line !== "string"))
    throw new Error("Invalid legacy page lines.");
  const { start, end } = legacyCodeRange(lines, entry);
  const rows = lines.slice(start, end).map((line) => line.slice(1));
  let first = 0,
    last = rows.length - 1;
  if (rows.some((line) => line.includes("kame-layout:legacy-"))) {
    ({ first, last } = managedLegacyCode(rows.join("\n"), entry));
  } else {
    const hash = crypto.createHash("sha256").update(rows.join("\n").trim()).digest("hex");
    if (hash !== originals[entry.page])
      throw new Error(`Unrecognised legacy block: ${entry.page}/${entry.block}.`);
  }
  const result = [
    ...lines.slice(0, start + first),
    ...entry.code
      .trimEnd()
      .split("\n")
      .map((line) => " " + line),
    ...lines.slice(start + last + 1),
  ];
  if (result.length >= 10000 || result.some((line) => /[\r\n\u2028\u2029]/.test(line)))
    throw new Error("Invalid legacy page size or lines.");
  return { title: page.title, lines: result };
}
