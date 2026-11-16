import { config, defaults, read } from "./project.mjs";

export const entryPage = "kame-layout:entry";
export const featurePage = (id) => `kame-layout:${id}`;

export function codeBlock(name, source) {
  return [`code:${name}`, ...source.split("\n").map((line) => ` ${line}`)];
}

export function createPackage() {
  const styles = defaults("styles").map(
    ({ feature }) => `@import "../${featurePage(feature.id)}/style.css";`,
  );
  styles.push('@import "./project.css";');
  const scripts = defaults("scripts").map(
    ({ feature }) => `import "../${featurePage(feature.id)}/script.js";`,
  );
  const pages = [
    {
      title: entryPage,
      lines: [
        entryPage,
        "kame-layout の読み込み入口です。GitHub から生成しています。",
        "",
        ...codeBlock("style.css", styles.join("\n")),
        "",
        ...codeBlock("script.js", scripts.join("\n")),
        "",
        ...codeBlock("project.css", read("src/theme/project.css")),
      ],
    },
  ];
  for (const feature of config.features) {
    const title = featurePage(feature.id);
    const lines = [
      title,
      feature.description,
      feature.usage,
      "",
      `[GitHubの説明 https://github.com/kamekingdom/kame-layout/tree/main/src/features/${feature.id}]`,
      "",
    ];
    for (const [name, filename] of Object.entries(feature.files))
      lines.push(...codeBlock(name, read(filename)), "");
    for (const name of feature.dataFiles ?? [])
      lines.push(...codeBlock(name, read(`src/features/${feature.id}/${name}`)), "");
    pages.push({ title, lines });
  }
  return { pages };
}

export function packageFiles(pkg) {
  const files = new Map();
  for (const page of pkg.pages) {
    for (let index = 0; index < page.lines.length; index++) {
      const match = /^code:(.+)$/.exec(page.lines[index]);
      if (!match) continue;
      const body = [];
      while (index + 1 < page.lines.length && page.lines[index + 1].startsWith(" "))
        body.push(page.lines[++index].slice(1));
      files.set(`${page.title}/${match[1]}`, body.join("\n"));
    }
  }
  return files;
}
