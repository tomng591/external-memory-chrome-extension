import fs from 'fs';
import path from 'path';

describe('Obsidian Research Integration', () => {
  const researchFilePath = path.resolve(__dirname, '../research/obsidian-storage.md');

  it('should have valid markdown research file', () => {
    expect(fs.existsSync(researchFilePath)).toBe(true);

    const content = fs.readFileSync(researchFilePath, 'utf-8');
    const size = Buffer.byteLength(content, 'utf-8');

    expect(size).toBeGreaterThan(5000);
    expect(size).toBeLessThan(100000);
  });

  it('should be accessible from project root', () => {
    const projectRoot = path.resolve(__dirname, '..');
    const expectedPath = path.join(projectRoot, 'research/obsidian-storage.md');

    expect(fs.existsSync(expectedPath)).toBe(true);
  });

  it('should contain implementation guidance', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('## Implementation Guidance');
    expect(content).toContain('ObsidianAdapter');
    expect(content).toContain('Task 3.2');
  });

  it('should have all MUST-PASS criteria documented', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');

    // 1. Vault structure documented
    expect(content).toContain('## Vault Structure');
    expect(content).toContain('.obsidian/');
    expect(content).toContain('conversations/');

    // 2. File format specification
    expect(content).toContain('## File Format Specification');

    // 3. YAML frontmatter specification with all fields
    expect(content).toContain('## YAML Frontmatter Specification');
    expect(content).toContain('id:');
    expect(content).toContain('platform:');
    expect(content).toContain('model:');
    expect(content).toContain('created_at:');
    expect(content).toContain('last_updated_at:');
    expect(content).toContain('message_count:');
    expect(content).toContain('title:');
    expect(content).toContain('tags:');

    // 4. Markdown message format specification
    expect(content).toContain('## Markdown Message Format');
    expect(content).toContain('## User');
    expect(content).toContain('## Assistant');

    // 5. Sample markdown conversations
    expect(content).toContain('### Sample 1:');
    expect(content).toContain('### Sample 2:');
  });

  it('should document HIGH-PRIORITY items', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');

    // File naming convention
    expect(content).toContain('YYYY-MM-DD-HH-mm-ss');

    // Folder structure
    expect(content).toContain('2025-11/');

    // Cross-reference guidance
    expect(content).toContain('WikiLink');

    // Metadata handling
    expect(content).toContain('Metadata');
  });

  it('should provide clear folder structure guidance', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');

    // Should include ASCII diagram or clear description
    const hasStructureInfo =
      content.includes('conversations/') &&
      content.includes('.obsidian/') &&
      content.includes('├──') || // ASCII box drawing or similar
      content.includes('│') ||
      content.includes('└──');

    expect(hasStructureInfo).toBe(true);
  });

  it('should document timestamp format for implementation', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');

    expect(content).toContain('Unix');
    expect(content).toContain('ISO 8601');
    expect(content).toContain('timestamp');
  });

  it('should include code examples for implementation', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');

    // Should have TypeScript examples
    expect(content).toContain('```typescript');

    // Should have YAML examples
    expect(content).toContain('```yaml');
  });

  it('should document sample conversation with valid format', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');

    // Check for both ChatGPT and Claude samples
    const hasChatGPT = content.includes('"platform": "chatgpt"') || content.includes('platform: "chatgpt"');
    expect(hasChatGPT).toBe(true);

    const hasClaude = content.includes('"platform": "claude"') || content.includes('platform: "claude"');
    expect(hasClaude).toBe(true);

    // Check for proper message format in samples
    expect(content).toContain('## User —');
    expect(content).toContain('## Assistant —');
  });

  it('should include references to documentation', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('## References');
    expect(content).toContain('help.obsidian.md');
  });

  it('should have clear sections with proper hierarchy', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');

    const sections = [
      '## Vault Structure',
      '## File Format Specification',
      '## YAML Frontmatter Specification',
      '## Markdown Message Format',
      '## Sample Conversation Files',
      '## Implementation Guidance',
      '## References'
    ];

    sections.forEach((section) => {
      expect(content).toContain(section);
    });
  });

  it('should be ready for Task 3.2 implementation', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');

    // Should have enough detail to implement adapter
    expect(content.length).toBeGreaterThan(10000);

    // Should have clear implementation guidance
    expect(content).toContain('For ObsidianAdapter');
    expect(content).toContain('should accept');
    expect(content).toContain('implement');
  });

  it('should document error handling considerations', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('Error Handling') || content.toContain('error');
  });

  it('should document best practices for the adapter', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('Best Practices') || content.toContain('practices');
  });
});
