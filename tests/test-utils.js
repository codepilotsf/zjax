import { readdirSync, writeFileSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';

import chalk from 'chalk';
import { addCoverageReport } from 'monocart-reporter';
import { expect } from '@playwright/test';
import slugify from '@sindresorhus/slugify';

const projectRoot = process.cwd();
const testsDir = path.join(projectRoot, 'tests');

export function withHtml(htmlBody, testBody) {
  return async function ({ page }, testInfo) {
    const htmlFile = path.join(testsDir, `${slugify(testInfo.title)}.html`);
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="stylesheet" href="https://cdn.simplecss.org/simple.min.css" />
          <script src="../dist/zjax.debug.js"></script>
        </head>
        <body>
          <div> ${htmlBody} </div>
        </body>
      </html>
    `;
    writeFileSync(htmlFile, htmlContent, 'utf-8');
    await runTest(page, htmlFile, testBody, testInfo);
  };
}

async function runTest(page, htmlFile, testBody, testInfo) {
  await page.coverage.startJSCoverage();
  await page.goto(`file://${htmlFile}`);
  await testBody(page, (selector) => expect(page.locator(selector)));
  const coverageData = await page.coverage.stopJSCoverage();
  await addCoverageReport(coverageData, testInfo);
}

export default class UsageHelper {
  constructor() {
    this.testFiles = null;
  }

  onBegin(_, suite) {
    this.testFiles = new Set(suite.allTests().map(test => slugify(test.title) + '.html'));
  }

  onEnd() {
    console.log('Coverage Report is under the top-right burger menu');
    const htmlFiles = readdirSync(testsDir).filter(file => file.endsWith('.html'));
    for (const filename of htmlFiles) {
      const isUnused = !this.testFiles.has(filename);
      if (isUnused) {
        console.log(chalk.red(`[Unused] Deleting tests/${filename}`));
        unlink(path.join(testsDir, filename));
      }
    }
  }

  onTestEnd(test, result) {
    if (result.status !== 'passed') {
      console.error('  ⚠️  ', chalk.bgRed(`tests/${slugify(test.title)}.html`));
    }
  }
}
