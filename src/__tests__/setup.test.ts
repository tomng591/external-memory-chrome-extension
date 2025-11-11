describe('Project Setup', () => {
  it('should have required dependencies installed', () => {
    const pkg = require('../../package.json');

    // Check production dependencies
    expect(pkg.dependencies).toHaveProperty('react');
    expect(pkg.dependencies).toHaveProperty('react-dom');
    expect(pkg.dependencies).toHaveProperty('zustand');

    // Check dev dependencies
    expect(pkg.devDependencies).toHaveProperty('vite');
    expect(pkg.devDependencies).toHaveProperty('typescript');
    expect(pkg.devDependencies).toHaveProperty('jest');
    expect(pkg.devDependencies).toHaveProperty('tailwindcss');
    expect(pkg.devDependencies).toHaveProperty('puppeteer');
  });

  it('should have required npm scripts defined', () => {
    const pkg = require('../../package.json');

    expect(pkg.scripts).toHaveProperty('dev');
    expect(pkg.scripts).toHaveProperty('build');
    expect(pkg.scripts).toHaveProperty('test');
    expect(pkg.scripts).toHaveProperty('test:watch');
    expect(pkg.scripts).toHaveProperty('test:integration');
    expect(pkg.scripts).toHaveProperty('tsc:check');
  });

  it('should have vite config file', () => {
    const fs = require('fs');
    const path = require('path');

    const viteConfigPath = path.join(__dirname, '../../vite.config.ts');
    expect(fs.existsSync(viteConfigPath)).toBe(true);
  });

  it('should have jest config file', () => {
    const fs = require('fs');
    const path = require('path');

    const jestConfigPath = path.join(__dirname, '../../jest.config.ts');
    expect(fs.existsSync(jestConfigPath)).toBe(true);
  });

  it('should have typescript config file', () => {
    const fs = require('fs');
    const path = require('path');

    const tsconfigPath = path.join(__dirname, '../../tsconfig.json');
    expect(fs.existsSync(tsconfigPath)).toBe(true);
  });

  it('should have tailwind config file', () => {
    const fs = require('fs');
    const path = require('path');

    const tailwindConfigPath = path.join(__dirname, '../../tailwind.config.ts');
    expect(fs.existsSync(tailwindConfigPath)).toBe(true);
  });

  it('should have src/index.css with tailwind import', () => {
    const fs = require('fs');
    const path = require('path');

    const cssPath = path.join(__dirname, '../index.css');
    const content = fs.readFileSync(cssPath, 'utf-8');

    expect(content).toContain('@import "tailwindcss"');
  });

  it('should have path aliases configured in tsconfig', () => {
    const fs = require('fs');
    const path = require('path');

    const tsconfigPath = path.join(__dirname, '../../tsconfig.json');
    const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');

    // Check for path alias strings in tsconfig content
    expect(tsconfigContent).toContain('"@/*"');
    expect(tsconfigContent).toContain('"@components/*"');
    expect(tsconfigContent).toContain('"@types/*"');
    expect(tsconfigContent).toContain('"@utils/*"');
    expect(tsconfigContent).toContain('"@services/*"');
    expect(tsconfigContent).toContain('"@adapters/*"');
  });
});
