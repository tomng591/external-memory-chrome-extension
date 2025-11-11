# Task 1.1: Initialize Vite + React 19 + TypeScript + TailwindCSS Project

## Description
Set up the complete project structure with all dependencies and build configuration for Chrome extension development. This includes Vite as build tool, React 19 for UI, TypeScript for type safety, and TailwindCSS v4 for styling.

## Implementation Detail

### Steps:
1. Create project root directory structure:
   - `src/` - source code
   - `public/` - static assets (icons, manifest.json)
   - `dist/` - build output (generated)
   - `tests/` - test files
   - `task-management/` - task tracking

2. Initialize Node.js project:
   - Create `package.json` with metadata
   - Set up npm scripts: `dev`, `build`, `test`, `test:integration`

3. Install dependencies:
   ```bash
   npm install react react-dom zustand
   npm install -D vite @vitejs/plugin-react typescript tailwindcss @tailwindcss/vite
   npm install -D @types/react @types/react-dom @types/node
   npm install -D jest @types/jest ts-jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom
   npm install -D puppeteer
   ```

4. Configure Vite (`vite.config.ts`):
   - Enable React plugin
   - Configure output paths for extension (relative paths)
   - Set up build for popup and content scripts as separate entry points

5. Configure TypeScript (`tsconfig.json`):
   - Target ES2020
   - Module: ESNext
   - JSX: react-jsx
   - Lib: ES2020 + DOM

6. Configure Jest (`jest.config.ts`):
   - Use ts-jest preset
   - Setup test environment for jsdom
   - Configure paths for module resolution

7. Configure TailwindCSS (`tailwind.config.ts`):
   - Set content paths for src files
   - Add theme configuration if needed

8. Create initial CSS (`src/index.css`):
   - Add `@import "tailwindcss";` for v4 setup

## Unit Test Detail

**Test File**: `src/__tests__/setup.test.ts`

Test cases:
- Verify `package.json` has all required dependencies
- Verify TypeScript configuration is valid (no tsconfig errors)
- Verify Jest configuration loads successfully
- Verify Vite config file exists and is syntactically valid

```typescript
describe('Project Setup', () => {
  it('should have required dependencies installed', () => {
    const pkg = require('../../package.json');
    expect(pkg.dependencies).toHaveProperty('react');
    expect(pkg.dependencies).toHaveProperty('zustand');
    expect(pkg.devDependencies).toHaveProperty('vite');
    expect(pkg.devDependencies).toHaveProperty('typescript');
  });
});
```

## Integration Test Detail

**Test File**: `tests/build.integration.test.ts`

Test cases:
- Run `npm run build` and verify dist folder is created
- Verify `dist/popup.html` exists (will be created later, for now just check build succeeds)
- Verify no TypeScript compilation errors
- Verify bundle size is reasonable

```typescript
describe('Build Integration', () => {
  it('should build without errors', async () => {
    const { execSync } = require('child_process');
    const output = execSync('npm run build', { encoding: 'utf-8' });
    expect(output).not.toContain('error');
    expect(fs.existsSync('dist')).toBe(true);
  });
});
```

## Manual Test Detail

1. Run `npm install` and verify no errors
2. Run `npm run build` and check that `dist/` folder is created
3. Verify no TypeScript errors: `npx tsc --noEmit`
4. Check that `.gitignore` includes `node_modules/`, `dist/`
5. Run `npm run test` and verify Jest runs without errors (even if no tests exist)

## Testing Requirements & Pass/Fail Criteria

### ✅ MUST-PASS (Blockers - Task cannot be completed without these)
1. **npm install succeeds**: No installation errors, all dependencies installed to `node_modules/`
2. **npm run build succeeds**: Produces `dist/` folder without errors or warnings
3. **TypeScript compilation passes**: `npx tsc --noEmit` returns exit code 0 (no TS errors)
4. **npm run test runs**: Jest runs without crashing (even if no tests exist yet)

**Pass Criteria**: All 4 above criteria must be met. If any fails, task is incomplete.

### ⚠️ HIGH-PRIORITY (Strongly Recommended - needed for next tasks)
1. **Vite config is valid**: `dist/` contains expected output structure
2. **TailwindCSS v4 setup**: CSS imports work without errors

**Pass Criteria**: At least 1 of 2 should work. If both fail, review Vite/TailwindCSS config.

### ⏭️ CAN SKIP/DEFER (Nice-to-have - can fix later)
1. **Unit tests pass**: Tests in `src/__tests__/setup.test.ts` (can be added/fixed in later iteration)
2. **Bundle optimization**: Tree-shaking, minification working perfectly (can optimize later)
3. **npm scripts testing**: All npm scripts (`dev`, `build`, `test`, `test:integration`) fully working

**Skip Criteria**: If `npm run test` doesn't find tests, that's OK - we'll add tests as we build.

### Recommended Testing Order:
1. **Manual first** (5 min): Run npm install, build, tsc check
2. **If manual passes**: Move to Task 1.2 ✅
3. **If manual fails**: Debug and fix configuration issues
4. **Unit tests later**: Add and refine tests incrementally

## Note / Status

- Status: Not Started
- Assigned to:
- Notes:
