/**
 * Generates the API reference and makes it safe for VitePress.
 *
 * VitePress compiles every markdown file as a Vue template, so a bare `<tag>`
 * that came from a TSDoc comment is parsed as an element and fails the build.
 * Escaping angle brackets outside code keeps that from being a tripwire every
 * time someone writes documentation.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(root, 'docs/api');

execFileSync('npx', ['typedoc'], {
  cwd: root,
  stdio: ['ignore', 'ignore', 'inherit'],
});

const PLACEHOLDER = (index) => `@@HAPPYPDF_CODE_${index}@@`;

const sanitize = (markdown) => {
  let inFence = false;

  return markdown
    .split('\n')
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;

      // Inline code already renders literally, so leave those spans alone.
      const spans = [];
      let out = line.replace(/`[^`]*`/g, (span) => {
        spans.push(span);
        return PLACEHOLDER(spans.length - 1);
      });

      out = out.replace(/</g, '&lt;').replace(/>/g, '&gt;');

      return out.replace(
        /@@HAPPYPDF_CODE_(\d+)@@/g,
        (_, index) => spans[Number(index)],
      );
    })
    .join('\n');
};

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.md') ? [full] : [];
  });

let changed = 0;
for (const file of walk(apiDir)) {
  const original = fs.readFileSync(file, 'utf8');
  const cleaned = sanitize(original);
  if (cleaned !== original) {
    fs.writeFileSync(file, cleaned);
    changed++;
  }
}

console.log(`API reference generated (${changed} files sanitized)`);
