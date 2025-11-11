import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

describe('Manifest Integration Tests', () => {
  const extensionPath = path.resolve(__dirname, '../dist');

  beforeAll(() => {
    // Build project
    console.log('Building project...');
    execSync('npm run build', { stdio: 'inherit' });
  });

  describe('Build output', () => {
    it('should copy manifest.json to dist/', () => {
      const manifestPath = path.join(extensionPath, 'manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);
    });

    it('should copy icon files to dist/icons/', () => {
      const iconPaths = [
        path.join(extensionPath, 'icons/icon-16.png'),
        path.join(extensionPath, 'icons/icon-48.png'),
        path.join(extensionPath, 'icons/icon-128.png'),
      ];

      iconPaths.forEach(iconPath => {
        expect(fs.existsSync(iconPath)).toBe(true);
      });
    });

    it('should build with no errors', () => {
      const distPath = path.join(extensionPath);
      expect(fs.existsSync(distPath)).toBe(true);

      // Verify essential files exist
      expect(fs.existsSync(path.join(distPath, 'manifest.json'))).toBe(true);
      expect(fs.existsSync(path.join(distPath, 'index.html'))).toBe(true);
    });
  });

  describe('Manifest file validation', () => {
    it('should have valid manifest.json in dist/', () => {
      const manifestPath = path.join(extensionPath, 'manifest.json');
      const content = fs.readFileSync(manifestPath, 'utf-8');

      // Should be valid JSON
      expect(() => JSON.parse(content)).not.toThrow();

      const manifest = JSON.parse(content);

      // Check required fields
      expect(manifest.manifest_version).toBe(3);
      expect(manifest.name).toBe('External Memory');
      expect(manifest.version).toBeDefined();
      expect(manifest.description).toBeDefined();
    });

    it('manifest.json should have all required sections', () => {
      const manifestPath = path.join(extensionPath, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      expect(manifest.permissions).toBeDefined();
      expect(manifest.action).toBeDefined();
      expect(manifest.content_scripts).toBeDefined();
      expect(manifest.background).toBeDefined();
    });

    it('should have correct content_scripts configuration', () => {
      const manifestPath = path.join(extensionPath, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      const contentScript = manifest.content_scripts[0];
      expect(contentScript.matches).toContain('https://chatgpt.com/*');
      expect(contentScript.matches).toContain('https://claude.ai/*');
      expect(contentScript.js[0]).toBe('content.js');
    });

    it('should have correct background.service_worker', () => {
      const manifestPath = path.join(extensionPath, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      expect(manifest.background.service_worker).toBe('background.js');
    });

    it('should have correct permissions', () => {
      const manifestPath = path.join(extensionPath, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      expect(manifest.permissions).toContain('storage');
      expect(manifest.permissions).toContain('scripting');
      expect(manifest.permissions).toContain('tabs');
    });
  });

  describe('Icon files in dist/', () => {
    it('all icon files should be valid PNG files', () => {
      const iconPaths = [
        path.join(extensionPath, 'icons/icon-16.png'),
        path.join(extensionPath, 'icons/icon-48.png'),
        path.join(extensionPath, 'icons/icon-128.png'),
      ];

      iconPaths.forEach(iconPath => {
        const buffer = fs.readFileSync(iconPath);
        // PNG files start with specific magic bytes: 89 50 4E 47
        expect(buffer[0]).toBe(0x89);
        expect(buffer[1]).toBe(0x50);
        expect(buffer[2]).toBe(0x4e);
        expect(buffer[3]).toBe(0x47);
      });
    });

    it('icon files should have content', () => {
      const iconPaths = [
        path.join(extensionPath, 'icons/icon-16.png'),
        path.join(extensionPath, 'icons/icon-48.png'),
        path.join(extensionPath, 'icons/icon-128.png'),
      ];

      iconPaths.forEach(iconPath => {
        const stats = fs.statSync(iconPath);
        expect(stats.size).toBeGreaterThan(0);
      });
    });
  });
});
