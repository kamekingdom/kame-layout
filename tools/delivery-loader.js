// Delivered as loader.js. The profile imports this module with a fresh URL per reload.
const version = "__KAME_LAYOUT_VERSION__";
const inlineProject = "__KAME_LAYOUT_INLINE_PROJECT__";
const base = new URL("./", import.meta.url);
const slot = Symbol.for("kame-layout.delivery");

function isEntry(href) {
  try {
    const url = new URL(href, location.href);
    return (
      url.origin === base.origin &&
      decodeURIComponent(url.pathname) === decodeURIComponent(new URL("style.css", base).pathname)
    );
  } catch {
    return false;
  }
}

async function install() {
  if (decodeURIComponent(location.pathname.split("/")[1] || "") === inlineProject) {
    // In the configured project, CSS is already the native Settings stylesheet.
    // Do not paint an older stylesheet and replace it after JavaScript starts.
    const deadline = Date.now() + 20000;
    while (
      getComputedStyle(document.documentElement)
        .getPropertyValue("--kame-layout-inline-version")
        .replace(/["'\s]/g, "") !== version
    ) {
      if (Date.now() > deadline)
        throw new Error(
          "Native UserCSS is not the published version. Reload after deployment succeeds.",
        );
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await import(new URL(`script.js?v=${version}`, base).href);
    document.documentElement.dataset.kameLayoutVersion = version;
    return { version };
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL(`style.css?v=${version}`, base).href;
  link.dataset.kameLayoutVersion = version;
  const ready = new Promise((resolve, reject) => {
    link.onload = resolve;
    link.onerror = () => {
      link.remove();
      reject(new Error("kame-layout stylesheet failed to load"));
    };
  });
  // Preserve the original ordering: delivery CSS precedes local Settings CSS.
  const firstUserSheet = [...document.querySelectorAll('link[rel="stylesheet"]')].find((node) =>
    new URL(node.href, location.href).pathname.startsWith("/api/code/"),
  );
  if (firstUserSheet) firstUserSheet.before(link);
  else document.head.appendChild(link);
  await ready;

  // Only after successful loading, remove legacy delivery imports in this document.
  // The saved Settings page is untouched and remains a fallback if loading fails.
  function removeLegacy(sheet) {
    let rules;
    try {
      rules = [...sheet.cssRules];
    } catch {
      return;
    }
    for (let i = rules.length - 1; i >= 0; i--) {
      const rule = rules[i];
      if (!rule.styleSheet) continue;
      if (isEntry(new URL(rule.href, sheet.href || location.href).href)) sheet.deleteRule(i);
      else removeLegacy(rule.styleSheet);
    }
  }
  for (const sheet of [...document.styleSheets]) if (sheet !== link.sheet) removeLegacy(sheet);
  for (const old of [...document.querySelectorAll('link[rel="stylesheet"]')])
    if (old !== link && isEntry(old.href)) old.remove();
  await import(new URL(`script.js?v=${version}`, base).href);
  document.documentElement.dataset.kameLayoutVersion = version;
  return { version };
}

// Duplicate imports during one document lifetime must not register handlers twice.
if (!globalThis[slot]) globalThis[slot] = install();
await globalThis[slot];
