/**
 * Integration Tests for Content Script
 *
 * Tests content script injection and functionality using Puppeteer
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';
import { execSync } from 'child_process';

describe('Content Script Integration', () => {
  let browser: Browser;
  const extensionPath = path.resolve(__dirname, '../dist');

  beforeAll(async () => {
    // Build extension before running tests
    execSync('npm run build', { stdio: 'inherit' });

    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--load-extension=${extensionPath}`,
        `--disable-extensions-except=${extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  it('should inject into ChatGPT page', async () => {
    const page = await browser.newPage();

    // Capture console messages
    const consoleLogs: string[] = [];
    page.on('console', (msg) => consoleLogs.push(msg.text()));

    try {
      await page.goto('https://chatgpt.com', { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for content script to log
      await page.waitForTimeout(1000);

      expect(consoleLogs.some((log) => log.includes('Content script loaded'))).toBe(true);
    } finally {
      await page.close();
    }
  });

  it('should inject into Claude.ai page', async () => {
    const page = await browser.newPage();

    // Capture console messages
    const consoleLogs: string[] = [];
    page.on('console', (msg) => consoleLogs.push(msg.text()));

    try {
      await page.goto('https://claude.ai', { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for content script to log
      await page.waitForTimeout(1000);

      expect(consoleLogs.some((log) => log.includes('Content script loaded'))).toBe(true);
    } finally {
      await page.close();
    }
  });

  it('should not break page functionality', async () => {
    const page = await browser.newPage();

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    try {
      await page.goto('https://chatgpt.com', { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Should have no critical errors
      expect(errors.length).toBe(0);
    } finally {
      await page.close();
    }
  });

  it('should not inject on unrelated sites', async () => {
    const page = await browser.newPage();

    const consoleLogs: string[] = [];
    page.on('console', (msg) => consoleLogs.push(msg.text()));

    try {
      await page.goto('https://www.google.com', { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait a moment
      await page.waitForTimeout(1000);

      // Should NOT have content script logs
      expect(consoleLogs.some((log) => log.includes('[External Memory]'))).toBe(false);
    } finally {
      await page.close();
    }
  });
});
