
import { exec } from 'node:child_process';
import chalk from 'chalk';
import slugify from '@sindresorhus/slugify';

exec('npx playwright test --list --reporter=json', (error, stdout, stderr) => {
  if (stderr) throw stderr;

  const tests = JSON.parse(stdout).suites.flatMap(suite => suite.specs);
  const bySlug = {};
  for (const test of tests) {
    const slug = slugify(test.title)
    const prev = bySlug[slug];
    if (prev) {
      console.error(chalk.red(`Error: duplicate test slug "${slug}":\n`));
      console.error(chalk.dim('    1'), `${prev.file}:${prev.line}:${prev.column} › ${prev.title}`);
      console.error(chalk.dim('    2'), `${test.file}:${test.line}:${test.column} › ${test.title}`);
      process.exit(1);
    }
    bySlug[slug] = test;
  }
});
