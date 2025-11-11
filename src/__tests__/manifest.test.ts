import fs from 'fs';
import path from 'path';

describe('manifest.json', () => {
  let manifest: any;

  beforeAll(() => {
    const manifestPath = path.join(__dirname, '../../public/manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    manifest = JSON.parse(manifestContent);
  });

  describe('Schema validation', () => {
    it('should be valid JSON', () => {
      expect(manifest).toBeDefined();
      expect(typeof manifest).toBe('object');
    });

    it('should have manifest_version 3', () => {
      expect(manifest.manifest_version).toBe(3);
    });

    it('should have required metadata fields', () => {
      expect(manifest.name).toBeDefined();
      expect(manifest.version).toBeDefined();
      expect(manifest.description).toBeDefined();
    });

    it('should have name "External Memory"', () => {
      expect(manifest.name).toBe('External Memory');
    });

    it('should have version string', () => {
      expect(typeof manifest.version).toBe('string');
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should have description string', () => {
      expect(typeof manifest.description).toBe('string');
      expect(manifest.description.length).toBeGreaterThan(0);
    });
  });

  describe('Icons configuration', () => {
    it('should have icons defined', () => {
      expect(manifest.icons).toBeDefined();
      expect(typeof manifest.icons).toBe('object');
    });

    it('should have icon sizes 16, 48, 128', () => {
      expect(manifest.icons).toHaveProperty('16');
      expect(manifest.icons).toHaveProperty('48');
      expect(manifest.icons).toHaveProperty('128');
    });

    it('should have valid icon paths', () => {
      expect(manifest.icons['16']).toContain('icon-16.png');
      expect(manifest.icons['48']).toContain('icon-48.png');
      expect(manifest.icons['128']).toContain('icon-128.png');
    });
  });

  describe('Permissions', () => {
    it('should have permissions array', () => {
      expect(manifest.permissions).toBeDefined();
      expect(Array.isArray(manifest.permissions)).toBe(true);
    });

    it('should have required storage permission', () => {
      expect(manifest.permissions).toContain('storage');
    });

    it('should have required scripting permission', () => {
      expect(manifest.permissions).toContain('scripting');
    });

    it('should have required tabs permission', () => {
      expect(manifest.permissions).toContain('tabs');
    });

    it('should only have expected permissions', () => {
      const expectedPermissions = ['storage', 'scripting', 'tabs'];
      manifest.permissions.forEach((perm: string) => {
        expect(expectedPermissions).toContain(perm);
      });
    });
  });

  describe('Action (Popup)', () => {
    it('should have action defined', () => {
      expect(manifest.action).toBeDefined();
      expect(typeof manifest.action).toBe('object');
    });

    it('should have default_popup set to popup.html', () => {
      expect(manifest.action.default_popup).toBe('popup.html');
    });

    it('should have default_title', () => {
      expect(manifest.action.default_title).toBe('External Memory');
    });
  });

  describe('Content scripts', () => {
    it('should have content_scripts array', () => {
      expect(manifest.content_scripts).toBeDefined();
      expect(Array.isArray(manifest.content_scripts)).toBe(true);
      expect(manifest.content_scripts.length).toBeGreaterThan(0);
    });

    it('should have matches for ChatGPT and Claude', () => {
      const contentScript = manifest.content_scripts[0];
      expect(contentScript.matches).toBeDefined();
      expect(Array.isArray(contentScript.matches)).toBe(true);
      expect(contentScript.matches).toContain('https://chatgpt.com/*');
      expect(contentScript.matches).toContain('https://claude.ai/*');
    });

    it('should have js entry pointing to content.js', () => {
      const contentScript = manifest.content_scripts[0];
      expect(contentScript.js).toBeDefined();
      expect(Array.isArray(contentScript.js)).toBe(true);
      expect(contentScript.js).toContain('content.js');
    });

    it('should run at document_start', () => {
      const contentScript = manifest.content_scripts[0];
      expect(contentScript.run_at).toBe('document_start');
    });
  });

  describe('Background service worker', () => {
    it('should have background defined', () => {
      expect(manifest.background).toBeDefined();
      expect(typeof manifest.background).toBe('object');
    });

    it('should have service_worker entry', () => {
      expect(manifest.background.service_worker).toBeDefined();
      expect(typeof manifest.background.service_worker).toBe('string');
    });

    it('should point to background.js', () => {
      expect(manifest.background.service_worker).toBe('background.js');
    });

    it('should not have deprecated background.page or background.scripts', () => {
      expect(manifest.background.page).toBeUndefined();
      expect(manifest.background.scripts).toBeUndefined();
    });
  });

  describe('Icon files exist', () => {
    it('should have icon-16.png file', () => {
      const iconPath = path.join(__dirname, '../../public/icons/icon-16.png');
      expect(fs.existsSync(iconPath)).toBe(true);
    });

    it('should have icon-48.png file', () => {
      const iconPath = path.join(__dirname, '../../public/icons/icon-48.png');
      expect(fs.existsSync(iconPath)).toBe(true);
    });

    it('should have icon-128.png file', () => {
      const iconPath = path.join(__dirname, '../../public/icons/icon-128.png');
      expect(fs.existsSync(iconPath)).toBe(true);
    });
  });
});
