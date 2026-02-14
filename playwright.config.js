import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['monocart-reporter', {
      coverage: {
        reports: ['v8', 'text', 'text-summary', 'lcovonly']
      }
    }]
  ]
});
