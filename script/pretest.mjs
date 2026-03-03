
import { exec } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import { slugify, outputDir } from '../test/base.js';

exec('npx playwright test --list --reporter=json', (error, stdout, stderr) => {
  if (stderr) throw stderr;

  const testList = JSON.parse(stdout);
  if (testList.errors.length) {
    console.error(testList.errors);
    process.exit(1);
  }

  const slugs = ensureSlugsUnique(testList.suites.flatMap(suite => suite.specs));
  deleteUnusedHtmls(new Set(slugs.map(slug => slug + '.html')));
});

function ensureSlugsUnique(tests) {
  const bySlug = {};
  for (const test of tests) {
    const slug = slugify(test.title);
    const prev = bySlug[slug];
    if (prev) {
      console.error(chalk.red(`Error: duplicate test slug "${slug}":\n`));
      console.error(chalk.dim('    1'), `${prev.file}:${prev.line}:${prev.column} › ${prev.title}`);
      console.error(chalk.dim('    2'), `${test.file}:${test.line}:${test.column} › ${test.title}`);
      process.exit(1);
    }
    bySlug[slug] = test;
  }
  return Object.keys(bySlug);
}

function deleteUnusedHtmls(usedHtmls) {
  for (const filename of readdirSync(outputDir)) {
    if (!usedHtmls.has(filename)) {
      console.log(chalk.yellow(`[Unused] Deleting test/out/${filename}`));
      unlink(path.join(outputDir, filename));
    }
  }
}
