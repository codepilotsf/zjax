import { globSync as findFiles } from 'node:fs';
import { defineConfig } from '@playwright/test';
import fs from 'node:fs';

const port = 7357;
const baseURL = `http://localhost:${port}`;
const reporter = [['list']];

if (process.env.COVERAGE) {
  reporter.push(
    ['monocart-reporter', {
      coverage: {
        reports: ['text', 'text-summary', 'lcovonly', ['v8', {
          metrics: ['lines', 'statements', 'functions', 'branches']
        }]],
        entryFilter: ({ url }) => url.startsWith(`${baseURL}/src`),
        sourcePath: (path) => findFiles(`src/**/${path}`)[0] ?? path,
        onEnd: (result) => {
          if (result.reportPath && fs.existsSync(result.reportPath)) {
            let html = fs.readFileSync(result.reportPath, 'utf-8');
            const hideUrlColumn = `
              <style>
                div[column="25"] { display: none; }
              </style>`;
            // Inject before closing </head>
            html = html.replace('</head>', `${hideUrlColumn}</head>`);
            fs.writeFileSync(result.reportPath, html, 'utf-8');
          }
        },
        outputDir: 'test/result/report/coverage',
      },
      outputFile: 'test/result/report/index.html',
    }],
    ['./test/base'],
  );
}

export default defineConfig({ 
  reporter,
  use: { baseURL },
  webServer: {
    url: baseURL,
    command: `VITE_HMR=false vite --strictPort --port ${port} --clearScreen false`,
    reuseExistingServer: !process.env.CI,
  },
  reporter,
  outputDir: 'test/result',
});
