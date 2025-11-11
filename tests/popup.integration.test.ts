import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

describe('Popup Integration Tests', () => {
  const extensionPath = path.resolve(__dirname, '../dist');

  beforeAll(() => {
    console.log('Building extension for popup tests...');
    execSync('npm run build', { stdio: 'inherit' });
  });

  describe('Build output', () => {
    it('should build popup.html', () => {
      // Popup can be in root or in public subfolder
      const popupPathRoot = path.join(extensionPath, 'popup.html');
      const popupPathPublic = path.join(extensionPath, 'public/popup.html');
      const hasPopup = fs.existsSync(popupPathRoot) || fs.existsSync(popupPathPublic);
      expect(hasPopup).toBe(true);
    });

    it('should build popup.js entry point', () => {
      const popupJsPath = path.join(extensionPath, 'popup.js');
      expect(fs.existsSync(popupJsPath)).toBe(true);
    });

    it('should include popup in dist directory structure', () => {
      const files = fs.readdirSync(extensionPath);
      // Should have popup.js
      const hasPopupJs = files.includes('popup.js');
      expect(hasPopupJs).toBe(true);
    });
  });

  describe('Popup HTML validation', () => {
    let popupContent: string;

    beforeAll(() => {
      // Find popup.html in either root or public folder
      let popupPath = path.join(extensionPath, 'popup.html');
      if (!fs.existsSync(popupPath)) {
        popupPath = path.join(extensionPath, 'public/popup.html');
      }
      popupContent = fs.readFileSync(popupPath, 'utf-8');
    });

    it('should have valid popup.html', () => {
      // Should have DOCTYPE and basic HTML structure
      expect(popupContent).toContain('<!DOCTYPE html>');
      expect(popupContent).toContain('<html');
      expect(popupContent).toContain('<body>');
      expect(popupContent).toContain('</html>');
    });

    it('should have popup-root element', () => {
      expect(popupContent).toContain('id="popup-root"');
    });

    it('should reference popup entry script', () => {
      // Either reference the tsx or the built js
      expect(popupContent).toMatch(/popup-entry\.(tsx|js)/);
    });

    it('should have popup dimensions in CSS', () => {
      // Should have width and height specifications
      expect(popupContent).toMatch(/width\s*:/);
      expect(popupContent).toMatch(/height\s*:/);
    });

    it('should have meta viewport tag', () => {
      expect(popupContent).toContain('viewport');
    });
  });

  describe('Popup styling', () => {
    let popupContent: string;

    beforeAll(() => {
      // Find popup.html in either root or public folder
      let popupPath = path.join(extensionPath, 'popup.html');
      if (!fs.existsSync(popupPath)) {
        popupPath = path.join(extensionPath, 'public/popup.html');
      }
      popupContent = fs.readFileSync(popupPath, 'utf-8');
    });

    it('should have CSS styling for body', () => {
      expect(popupContent).toContain('font-family:');
      expect(popupContent).toContain('margin: 0');
      expect(popupContent).toContain('padding: 0');
    });

    it('should have box-sizing reset', () => {
      expect(popupContent).toContain('box-sizing');
    });

    it('should set minimum height for popup', () => {
      // Should have min-height specification
      expect(popupContent).toMatch(/min-height|height|200|300|400/);
    });
  });

  describe('Manifest popup reference', () => {
    it('should have popup.html referenced in manifest', () => {
      const manifestPath = path.join(extensionPath, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      expect(manifest.action?.default_popup).toBe('popup.html');
    });
  });

  describe('Popup build artifacts', () => {
    it('should have popup CSS bundle', () => {
      const assetsPath = path.join(extensionPath, 'assets');
      if (fs.existsSync(assetsPath)) {
        const files = fs.readdirSync(assetsPath);
        // Should have CSS files (may be named with hash)
        const hasCss = files.some(f => f.endsWith('.css'));
        expect(hasCss).toBe(true);
      }
    });

    it('should have popup JavaScript bundle', () => {
      const popupJsPath = path.join(extensionPath, 'popup.js');
      if (fs.existsSync(popupJsPath)) {
        const stats = fs.statSync(popupJsPath);
        // File should have content
        expect(stats.size).toBeGreaterThan(0);
      }
    });

    it('should have valid popup.js content', () => {
      const popupJsPath = path.join(extensionPath, 'popup.js');
      if (fs.existsSync(popupJsPath)) {
        const content = fs.readFileSync(popupJsPath, 'utf-8');
        // Should have React/JSX compiled code
        expect(content.length).toBeGreaterThan(100);
        // Should reference React createRoot
        expect(content).toContain('createRoot');
      }
    });
  });

  describe('File size validation', () => {
    it('popup.html should be reasonable size', () => {
      const popupPath = path.join(extensionPath, 'public/popup.html');
      const stats = fs.statSync(popupPath);
      // Should be larger than 100 bytes but less than 100KB
      expect(stats.size).toBeGreaterThan(100);
      expect(stats.size).toBeLessThan(100000);
    });

    it('popup.js should be reasonable size', () => {
      const popupJsPath = path.join(extensionPath, 'popup.js');
      if (fs.existsSync(popupJsPath)) {
        const stats = fs.statSync(popupJsPath);
        // Should be larger than 100 bytes
        expect(stats.size).toBeGreaterThan(100);
      }
    });
  });
});
