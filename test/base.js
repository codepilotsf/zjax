import { writeFileSync } from 'node:fs';
import path from 'node:path';

import chalk from 'chalk';
import { addCoverageReport } from 'monocart-reporter';
import slugifier from '@sindresorhus/slugify';

export const outputDir = path.join(import.meta.dirname, 'out');

export function withHtml(htmlBody, testBody) {
  return async function ({ page }, testInfo) {
    const htmlFile = `${slugify(testInfo.title)}.html`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="stylesheet" href="https://cdn.simplecss.org/simple.min.css"/>
          <script type="module" src="/src/main.js"></script>
        </head>
        <body>
          <main>${htmlBody}</main>
          <script src="../assets/use-dev-server.js"></script>
        </body>
      </html>
    `;
    writeFileSync(path.join(outputDir, htmlFile), htmlContent, 'utf-8');

    page.logs = [];
    page.errors = [];
    page.debugs = [];
    page.on('console', msg => page[`${msg.type()}s`].push(msg.text()));

    await runTest(page, htmlFile, testBody, testInfo);
  };
}

async function runTest(page, htmlFile, testBody, testInfo) {
  await page.coverage.startJSCoverage();
  await page.goto(`/test/out/${htmlFile}`);
  await testBody(page);
  const coverageData = await page.coverage.stopJSCoverage();
  await addCoverageReport(coverageData, testInfo);
}

export function slugify(string) {
  return slugifier(string, {
    customReplacements: [
      ['*', 'star'],
      ['/', '-or-'],
      ['->', '-to-'],
    ]
  });
}

export default class {
  onTestEnd(test, result) {
    if (result.status !== 'passed') {
      console.error('⚠️', chalk.bgRed(`test/out/${slugify(test.title)}.html`));
    }
  }

  onEnd() {
    console.log('coverage report:', chalk.cyan('open test/result/report/coverage/index.html'));
  }
}
