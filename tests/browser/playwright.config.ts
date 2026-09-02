import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const extensionPath = path.join(__dirname, '../../Frontend/dist'); // Adjust based on build output

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 1, // Avoid port/profile conflicts with extension testing
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
