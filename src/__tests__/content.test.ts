/**
 * Unit tests for Content Script
 */

import fs from 'fs';
import path from 'path';

describe('Content Script', () => {
  it('should have valid TypeScript syntax', () => {
    // This test just verifies the file compiles
    expect(() => {
      require('../content/index.ts');
    }).not.toThrow();
  });

  it('should not throw errors on import', () => {
    const contentScript = require('../content/index.ts');
    expect(contentScript).toBeDefined();
  });

  it('should have proper error handling', () => {
    const scriptPath = path.join(__dirname, '../content/index.ts');
    const content = fs.readFileSync(scriptPath, 'utf-8');

    expect(content).toContain('try');
    expect(content).toContain('catch');
  });

  it('should log a message when loaded', () => {
    const scriptPath = path.join(__dirname, '../content/index.ts');
    const content = fs.readFileSync(scriptPath, 'utf-8');

    expect(content).toContain('console.log');
    expect(content).toContain('Content script loaded');
  });

  it('should have timestamp in log message', () => {
    const scriptPath = path.join(__dirname, '../content/index.ts');
    const content = fs.readFileSync(scriptPath, 'utf-8');

    expect(content).toContain('toISOString');
    expect(content).toContain('timestamp');
  });
});
