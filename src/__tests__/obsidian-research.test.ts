import fs from 'fs';
import path from 'path';

describe('Obsidian Research Documentation', () => {
  const researchFilePath = path.resolve(__dirname, '../../research/obsidian-storage.md');

  beforeAll(() => {
    if (!fs.existsSync(researchFilePath)) {
      throw new Error(`Research file not found at ${researchFilePath}`);
    }
  });

  it('should have research file created', () => {
    expect(fs.existsSync(researchFilePath)).toBe(true);
  });

  it('should have valid file size', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    const size = Buffer.byteLength(content, 'utf-8');
    expect(size).toBeGreaterThan(5000); // Should be substantial documentation
    expect(size).toBeLessThan(100000); // But not unreasonably large
  });

  it('should contain vault structure section', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('## Vault Structure');
    expect(content).toContain('conversations/');
    expect(content).toContain('.obsidian/');
  });

  it('should include YAML frontmatter specification', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('## YAML Frontmatter Specification');
    expect(content).toContain('---');
    expect(content).toContain('id:');
    expect(content).toContain('platform:');
    expect(content).toContain('model:');
    expect(content).toContain('created_at:');
    expect(content).toContain('last_updated_at:');
    expect(content).toContain('message_count:');
    expect(content).toContain('title:');
    expect(content).toContain('tags:');
  });

  it('should include markdown message format specification', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('## Markdown Message Format');
    expect(content).toContain('## User');
    expect(content).toContain('## Assistant');
    expect(content).toContain('Timestamp');
  });

  it('should include sample markdown conversation files', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('### Sample 1:');
    expect(content).toContain('### Sample 2:');
    expect(content).toContain('platform: "chatgpt"');
    expect(content).toContain('platform: "claude"');
  });

  it('should include ChatGPT sample with realistic format', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('model: "gpt-4"');
    expect(content).toContain('User — 2025-11-12');
    expect(content).toContain('Assistant — 2025-11-12');
  });

  it('should include Claude sample with realistic format', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('model: "claude-3-opus-20240229"');
  });

  it('should include implementation guidance section', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('## Implementation Guidance');
    expect(content).toContain('ObsidianAdapter');
    expect(content).toContain('Task 3.2');
  });

  it('should include file naming convention', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('YYYY-MM-DD-HH-mm-ss');
    expect(content).toContain('2025-11-12-10-30-45');
  });

  it('should include folder structure organization', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('conversations/');
    expect(content).toContain('2025-11/');
    expect(content).toContain('conversation-index.md');
  });

  it('should include cross-reference guidance', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('WikiLink');
    expect(content).toContain('[[');
  });

  it('should have proper table of contents', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('## Table of Contents');
    expect(content).toContain('1. [Vault Structure]');
    expect(content).toContain('2. [File Format Specification]');
    expect(content).toContain('3. [YAML Frontmatter Specification]');
  });

  it('should include references section', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('## References');
    expect(content).toContain('https://help.obsidian.md');
  });

  it('should have properly formatted markdown syntax', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    // Check for proper heading hierarchy
    expect(content.match(/^## /gm)).toBeTruthy();
    expect(content.match(/^### /gm)).toBeTruthy();
    expect(content.match(/^## /gm)!.length).toBeGreaterThan(5);
  });

  it('should have valid code block examples', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    // Check for code blocks
    const codeBlocks = content.match(/```[\s\S]*?```/g);
    expect(codeBlocks).toBeTruthy();
    expect(codeBlocks!.length).toBeGreaterThan(3);
  });

  it('should define all required YAML fields', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    const requiredFields = ['id', 'platform', 'model', 'created_at', 'last_updated_at', 'message_count', 'title', 'tags'];

    requiredFields.forEach((field) => {
      expect(content).toContain(`\`${field}\``);
    });
  });

  it('should specify platform values', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('chatgpt');
    expect(content).toContain('claude');
  });

  it('should include message timestamp format', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('ISO 8601');
    expect(content).toContain('UTC');
    expect(content).toContain('timestamp');
  });

  it('should be valid markdown with no obvious syntax errors', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    // Check that triple dashes are balanced
    const yamlMarkers = (content.match(/^---$/gm) || []).length;
    expect(yamlMarkers).toBeGreaterThanOrEqual(2); // At least one sample with YAML

    // Check that code blocks are balanced (only count at start of line)
    const backtickCount = (content.match(/^```/gm) || []).length;
    expect(backtickCount % 2).toBe(0); // Even number of backticks
  });

  it('should document conversation storage strategy', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('conversation');
    expect(content).toContain('storage');
    expect(content).toContain('strategy');
  });

  it('should include content preservation guidelines', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('Content Preservation');
    expect(content).toContain('Code blocks');
    expect(content).toContain('Links');
  });

  it('should have implementation guidance for message conversion', () => {
    const content = fs.readFileSync(researchFilePath, 'utf-8');
    expect(content).toContain('Message to Markdown Conversion');
    expect(content).toContain('messageToMarkdown');
  });
});
