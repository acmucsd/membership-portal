import * as ts from 'typescript';
import * as fs from 'fs';

describe('order of migrations', () => {
  const dirname = './migrations/';
  const migrations = fs
    .readdirSync(dirname)
    .map((filename) => `./migrations/${filename}`)
    .filter((filename) => filename.endsWith('.ts'));

  test('filename prefixes are incremented and not duplicated', () => {
    const filenameOffset = dirname.length;
    for (let i = 0; i < migrations.length; i += 1) {
      const prefix = migrations[i].substr(filenameOffset, 4);
      expect(Number(prefix)).toBe(i + 1);
    }
  });

  test('timestamps are strictly increasing', () => {
    let latest = 0;
    for (let i = 0; i < migrations.length; i += 1) {
      const filename = migrations[i];
      // reads in the migration file
      const text = fs.readFileSync(filename, 'utf-8');
      // uses TypeScript's Compiler API to parse migration into an AST
      const ast = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest);
      let timestamp: number;
      // traverses the AST for the class declaration
      ast.forEachChild((child) => {
        if (child.kind === ts.SyntaxKind.ClassDeclaration) {
          // gets the class name from the class declaration
          const clazz = String((<ts.ClassDeclaration>child).name.escapedText);
          // parses the timestamp in the class name
          timestamp = Number(clazz.substr(-13));
        }
      });
      expect(timestamp).toBeGreaterThan(latest);
      latest = timestamp;
    }
  });
});
