/**
 * Integration Tests for Service Worker
 *
 * Tests service worker activation and message handling
 */

import puppeteer, { Browser } from 'puppeteer';
import path from 'path';
import { execSync } from 'child_process';
import fs from 'fs';

describe('Service Worker Integration', () => {
  let browser: Browser;
  const extensionPath = path.resolve(__dirname, '../dist');

  beforeAll(async () => {
    // Build extension before running tests
    execSync('npm run build', { stdio: 'inherit' });
  });

  beforeEach(async () => {
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

  afterEach(async () => {
    if (browser) {
      await browser.close();
    }
  });

  it('should start without errors', async () => {
    const page = await browser.newPage();

    try {
      await page.goto('chrome://extensions', { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for page to load
      await page.waitForTimeout(1000);

      // Verify extension is visible on the page
      const extensionFound = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('External Memory');
      });

      expect(extensionFound).toBe(true);
    } finally {
      await page.close();
    }
  });

  it('should have service worker configured in manifest', async () => {
    const manifestPath = path.join(extensionPath, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    expect(manifest.background).toBeDefined();
    expect(manifest.background.service_worker).toBeDefined();
    expect(manifest.background.service_worker).toBe('background.js');
  });

  it('should have background.js file in dist', async () => {
    const backgroundJsPath = path.join(extensionPath, 'background.js');
    expect(fs.existsSync(backgroundJsPath)).toBe(true);
  });

  it('should have valid service worker code', async () => {
    const backgroundJsPath = path.join(extensionPath, 'background.js');
    const content = fs.readFileSync(backgroundJsPath, 'utf-8');

    // Verify key phrases are in the built file (minified)
    expect(content.length > 0).toBe(true);
    // Check for startup logging (even if minified)
    expect(content).toContain('Service worker');
  });

  it('should have message listener in service worker', async () => {
    const backgroundTsPath = path.join(__dirname, '../src/background.ts');
    const content = fs.readFileSync(backgroundTsPath, 'utf-8');

    expect(content).toContain('chrome.runtime.onMessage.addListener');
    expect(content).toContain('message');
    expect(content).toContain('sender');
    expect(content).toContain('sendResponse');
  });

  it('should have error handling in message listener', async () => {
    const backgroundTsPath = path.join(__dirname, '../src/background.ts');
    const content = fs.readFileSync(backgroundTsPath, 'utf-8');

    // Verify try-catch exists in message handler
    const messageHandlerLines = content.split('\n');
    const hasErrorHandling = messageHandlerLines.some(
      (line) => line.includes('try') || line.includes('catch')
    );

    expect(hasErrorHandling).toBe(true);
  });
});
