import path from "node:path";
import postcss from "postcss";
import prettier from "prettier";
import { read, root } from "./project.mjs";

// Source files stay small; deployment keeps one stylesheet per feature, so
// splitting a feature does not add nested network requests in Scrapbox.
export function compileStyles(filename, readSource = read) {
  function compile(filename, stack = []) {
    if (stack.includes(filename))
      throw new Error(`Circular stylesheet import: ${[...stack, filename].join(" -> ")}`);
    const source = readSource(filename);
    const tree = postcss.parse(source, { from: filename });
    let changed = false;
    tree.walkAtRules("import", (rule) => {
      const match = /^(["'])(\.[^"']+)\1\s*$/.exec(rule.params);
      if (!match) {
        if (/^(?:url\(\s*)?["']\./.test(rule.params))
          throw new Error(`Use an unqualified relative CSS import in ${filename}: ${rule.params}`);
        return;
      }
      if (rule.parent.type !== "root") throw new Error(`Nested CSS import in ${filename}`);
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(filename), match[2]));
      const imported = postcss.parse(compile(target, [...stack, filename]));
      if (imported.nodes.length) imported.nodes[0].raws.before = rule.raws.before;
      rule.replaceWith(...imported.nodes);
      changed = true;
    });
    return changed ? tree.toString() : source;
  }
  return compile(filename);
}

// Custom properties are token streams, including case and string spelling.
// Preserve those streams even when Prettier normalises ordinary CSS colours.
export async function formatStyles(source) {
  const values = [];
  postcss.parse(source).walkDecls(/^--/, (decl) => values.push(decl.value));
  const options = await prettier.resolveConfig(path.join(root, "style.css"));
  const formatted = postcss.parse(await prettier.format(source, { ...options, parser: "css" }));
  let index = 0;
  formatted.walkDecls(/^--/, (decl) => {
    decl.value = values[index++];
  });
  return formatted.toString();
}
