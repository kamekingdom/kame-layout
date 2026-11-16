import fs from "node:fs";
import path from "node:path";
import { parse } from "acorn";
import postcss from "postcss";
import { root, read, config, categories, defaults } from "./project.mjs";

const errors = [];
const ids = new Set();
for (const feature of config.features) {
  if (!/^[a-z][a-z0-9-]+$/.test(feature.id) || ids.has(feature.id))
    errors.push(`Invalid/duplicate id: ${feature.id}`);
  ids.add(feature.id);
  if (!categories[feature.category] || !feature.description || !feature.usage)
    errors.push(`Missing documentation: ${feature.id}`);
  const files = [
    ...Object.values(feature.files),
    ...(feature.dataFiles ?? []).map((name) => `src/features/${feature.id}/${name}`),
  ];
  for (const filename of files) {
    try {
      const text = read(filename);
      if (filename.endsWith(".css")) postcss.parse(text, { from: filename });
      if (filename.endsWith(".js")) {
        const ast = parse(text, { ecmaVersion: "latest", sourceType: "module" });
        for (const node of ast.body) {
          if (node.type !== "ImportDeclaration") continue;
          const dependency = node.source.value;
          if (dependency.startsWith(".")) {
            if (!fs.existsSync(path.resolve(root, path.dirname(filename), dependency)))
              errors.push(`${filename}: missing ${dependency}`);
          } else if (!dependency.startsWith("https://"))
            errors.push(`${filename}: non-portable import ${dependency}`);
        }
      }
    } catch (error) {
      errors.push(`${filename}: ${error.message.replaceAll(`${root}/`, "")}`);
    }
  }
}
for (const kind of ["styles", "scripts"]) {
  if (new Set(config.defaults[kind]).size !== config.defaults[kind].length)
    errors.push(`Duplicate default ${kind}`);
  defaults(kind);
}
if (errors.length) {
  errors.forEach((error) => console.error(error));
  process.exitCode = 1;
} else console.log(`PASS: ${ids.size} documented features; syntax and relative imports are valid.`);
