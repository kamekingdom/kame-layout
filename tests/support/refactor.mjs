import assert from "node:assert/strict";
import path from "node:path";
import { parse } from "acorn";
import { analyze } from "eslint-scope";
import { read } from "../../tools/project.mjs";

const manifest = JSON.parse(read("tests/fixtures/original/refactors.json"));
const ast = (text) => parse(text, { ecmaVersion: "latest", sourceType: "module", ranges: true });
const declarationName = (node) => node.id?.name ?? node.declarations?.[0]?.id?.name;
const bodyOf = (tree) =>
  tree.body.find(
    (node) =>
      node.type === "ExpressionStatement" &&
      node.expression.type === "CallExpression" &&
      ["ArrowFunctionExpression", "FunctionExpression"].includes(node.expression.callee.type),
  ).expression.callee.body;

function inertInitializer(node) {
  if (!node) return false;
  switch (node.type) {
    case "Literal":
    case "Identifier":
    case "ArrowFunctionExpression":
    case "FunctionExpression":
      return true;
    case "ObjectExpression":
      return node.properties.every(
        (property) =>
          property.type === "Property" && !property.computed && inertInitializer(property.value),
      );
    case "ArrayExpression":
      return node.elements.every((element) => element === null || inertInitializer(element));
    case "BinaryExpression":
      return inertInitializer(node.left) && inertInitializer(node.right);
    case "UnaryExpression":
      return node.operator !== "delete" && inertInitializer(node.argument);
    case "TemplateLiteral":
      return node.expressions.every(inertInitializer);
    default:
      return false;
  }
}

// Reconstruct the original lexical scope for comparison, without changing the
// baseline. Extra statements, changed helpers or a captured variable lost during
// extraction all fail independently of the extraction script.
export function restoreFeatureModules(tree, filename, reference) {
  const modules = manifest.modules[filename];
  if (!modules) return tree;
  const originalGlobals = new Set(
    analyze(reference, { ecmaVersion: 2024, sourceType: "module" }).globalScope.through.map(
      (ref) => ref.identifier.name,
    ),
  );
  const declarations = new Map();
  const exported = new Map();
  const parsed = new Map();
  for (const [module, expectedNames] of Object.entries(modules)) {
    const filenameOfModule = path.posix.join(path.posix.dirname(filename), module);
    const moduleAst = ast(read(filenameOfModule));
    parsed.set(module, moduleAst);
    const names = [];
    for (const node of moduleAst.body) {
      if (node.type === "ImportDeclaration") continue;
      assert.equal(node.type, "ExportNamedDeclaration", filenameOfModule);
      const declaration = node.declaration;
      assert.ok(declaration, filenameOfModule);
      const name = declarationName(declaration);
      assert.ok(name && !declarations.has(name), `${filenameOfModule}: ${name}`);
      if (declaration.type === "VariableDeclaration") {
        assert.equal(declaration.kind, "const");
        assert.equal(declaration.declarations.length, 1);
        assert.ok(
          inertInitializer(declaration.declarations[0].init),
          `${filenameOfModule}: side effect`,
        );
      } else if (declaration.type === "ClassDeclaration") {
        assert.ok(!declaration.superClass || declaration.superClass.name === "Error");
        assert.ok(
          declaration.body.body.every(
            (member) => member.type === "MethodDefinition" && !member.computed,
          ),
        );
      } else assert.equal(declaration.type, "FunctionDeclaration");
      names.push(name);
      declarations.set(name, declaration);
    }
    assert.deepEqual([...names].sort(), [...expectedNames].sort(), filenameOfModule);
    exported.set(module, new Set(names));
    const globals = analyze(moduleAst, { ecmaVersion: 2024, sourceType: "module" }).globalScope
      .through;
    for (const ref of globals)
      assert.ok(
        originalGlobals.has(ref.identifier.name),
        `${filenameOfModule}: lost closure ${ref.identifier.name}`,
      );
  }
  const checkImport = (node) => {
    const module = node.source.value.replace(/^\.\//, "");
    assert.ok(exported.has(module), node.source.value);
    for (const specifier of node.specifiers) {
      assert.equal(specifier.type, "ImportSpecifier");
      assert.equal(specifier.local.name, specifier.imported.name);
      assert.ok(exported.get(module).has(specifier.imported.name), specifier.imported.name);
    }
  };
  for (const moduleAst of parsed.values())
    for (const node of moduleAst.body) if (node.type === "ImportDeclaration") checkImport(node);
  tree.body = tree.body.filter((node) => {
    if (node.type !== "ImportDeclaration" || !exported.has(node.source.value.replace(/^\.\//, "")))
      return true;
    checkImport(node);
    return false;
  });
  const originalBody = bodyOf(reference).body;
  const current = bodyOf(tree);
  const currentCount = current.body.length;
  let index = 0;
  current.body = originalBody.map((node) => {
    const name = declarationName(node);
    return declarations.has(name) ? declarations.get(name) : current.body[index++];
  });
  assert.equal(index, currentCount, `${filename}: unexpected controller statement`);
  assert.ok(current.body.every(Boolean), filename);
  return tree;
}
