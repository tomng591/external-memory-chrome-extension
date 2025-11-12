# Task 3.1: Research Obsidian Vault File Structure

## Description
Research and document Obsidian's vault file structure, storage format, and metadata handling. This research will inform the implementation of ObsidianAdapter in Task 3.2. The goal is to understand how to structure markdown files and organize conversations within an Obsidian vault to enable seamless integration with the External Memory extension.

## Implementation Detail

### Steps:
1. Research Obsidian vault structure:
   - Read official Obsidian documentation on vault structure and file organization
   - Understand vault root directory structure and metadata files
   - Document folder hierarchy conventions (recommended organization)
   - Research `.obsidian/` configuration directory and its purpose

2. Understand markdown file format in Obsidian:
   - Research Obsidian's markdown support and frontmatter (YAML) format
   - Learn about WikiLink syntax (`[[note-name]]`) for cross-references
   - Document metadata storage using YAML frontmatter
   - Research note properties and metadata fields (created date, modified date, tags)

3. Design conversation storage strategy:
   - Plan vault structure: single conversations vault with dedicated folder for captured conversations
   - Decide on file naming convention (e.g., `YYYY-MM-DD-HH-mm-ss-conversation-id.md`)
   - Design folder structure within vault:
     - `/conversations/` - all captured conversations
     - `/conversations/2025-11/` - organized by month (or by year)
     - Supporting folders for metadata, indexes, etc.

4. Design markdown file format for conversations:
   - Plan YAML frontmatter with metadata:
     - `id`: unique conversation identifier
     - `platform`: source platform (chatgpt or claude)
     - `model`: LLM model used (e.g., gpt-4, claude-3)
     - `created_at`: timestamp when conversation started
     - `last_updated_at`: timestamp of last message in conversation
     - `message_count`: number of messages in conversation
     - `tags`: auto-generated tags (platform-based, model-based)
   - Plan message storage format:
     - Use markdown headings for messages (e.g., `## User` / `## Assistant`)
     - Include timestamp for each message
     - Preserve original content formatting
   - Plan conversation metadata:
     - Summary or first message as conversation title
     - Links to related conversations (if applicable)

5. Create sample markdown file:
   - Generate realistic example markdown file showing a captured conversation
   - Include properly formatted YAML frontmatter
   - Show 2-3 message exchanges (user and assistant)
   - Include proper markdown formatting and timestamps
   - Demonstrate how the format handles code blocks, lists, emphasis, etc.

6. Document findings in research file:
   - Create `research/obsidian-storage.md` file
   - Document vault structure with ASCII diagrams or clear text descriptions
   - Include YAML frontmatter specification for conversation files
   - Include markdown file format specification and examples
   - Add references to official Obsidian documentation
   - Provide implementation guidance for ObsidianAdapter

### Key Research Topics:
- Official Obsidian vault structure: https://help.obsidian.md/Obsidian/Obsidian
- File organization patterns: https://help.obsidian.md/How+to/Working+with+multiple+vaults
- Markdown and frontmatter: https://help.obsidian.md/Editing+and+formatting/Obsidian+Flavored+Markdown
- Metadata and properties: https://help.obsidian.md/Editing+and+formatting/Properties
- API documentation (for future use): https://docs.obsidian.md/

## Unit Test Detail

**Test File**: `src/__tests__/obsidian-research.test.ts`

Test cases:
- Verify that `research/obsidian-storage.md` file exists
- Verify file contains required sections (Vault Structure, File Format, Markdown Specification, etc.)
- Verify file includes YAML frontmatter example
- Verify file includes sample markdown conversation
- Verify sample conversation markdown is valid (contains proper metadata and message structure)

```typescript
describe('Obsidian Research Documentation', () => {
  it('should have research file created', () => {
    const fs = require('fs');
    const path = require('path');
    const researchFile = path.join(__dirname, '../../research/obsidian-storage.md');
    expect(fs.existsSync(researchFile)).toBe(true);
  });

  it('should contain vault structure section', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./research/obsidian-storage.md', 'utf-8');
    expect(content).toContain('Vault Structure');
    expect(content).toContain('conversations');
  });

  it('should include YAML frontmatter specification', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./research/obsidian-storage.md', 'utf-8');
    expect(content).toContain('---');
    expect(content).toContain('id:');
    expect(content).toContain('platform:');
  });

  it('should include sample markdown conversation', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./research/obsidian-storage.md', 'utf-8');
    expect(content).toContain('## User');
    expect(content).toContain('## Assistant');
  });
});
```

## Integration Test Detail

**Test File**: `tests/obsidian-research.integration.test.ts`

Test cases:
- Verify research file is accessible from project root
- Verify markdown syntax in research file is valid (no broken links, proper formatting)
- Verify file size is reasonable (> 500 bytes, < 50 KB)
- Verify file contains actionable guidance for implementation

```typescript
describe('Obsidian Research Integration', () => {
  it('should have valid markdown research file', () => {
    const fs = require('fs');
    const path = require('path');
    const researchFile = path.resolve('./research/obsidian-storage.md');
    expect(fs.existsSync(researchFile)).toBe(true);

    const content = fs.readFileSync(researchFile, 'utf-8');
    const size = Buffer.byteLength(content, 'utf-8');
    expect(size).toBeGreaterThan(500);
    expect(size).toBeLessThan(50000);
  });

  it('should contain implementation guidance', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./research/obsidian-storage.md', 'utf-8');
    expect(content).toContain('Implementation');
  });
});
```

## Manual Test Detail

1. Create `research/` directory in project root (if not exists)
2. Research Obsidian documentation:
   - Visit https://help.obsidian.md/ and review vault structure documentation
   - Download Obsidian and create a test vault to verify file structure
   - Examine `.obsidian/` directory contents and configuration files
   - Test markdown with YAML frontmatter in Obsidian
3. Create comprehensive `research/obsidian-storage.md` file with:
   - Vault structure diagram or ASCII art
   - File naming conventions
   - YAML frontmatter specification with all fields
   - Complete markdown file format specification
   - At least 2 sample markdown files showing different message exchanges
   - Implementation guidance for Task 3.2
4. Verify file is readable and well-formatted:
   - Review markdown syntax with preview
   - Ensure code blocks are properly formatted
   - Check that examples are realistic and usable

## Testing Requirements & Pass/Fail Criteria

### ✅ MUST-PASS (Blockers - Task cannot be completed without these)
1. **Research file created**: `research/obsidian-storage.md` exists in project
2. **Vault structure documented**: File includes clear explanation of vault folder structure (root, `.obsidian/`, `/conversations/`)
3. **File format specification**: YAML frontmatter specification is documented with all required fields (id, platform, model, created_at, last_updated_at, message_count, tags)
4. **Markdown format specification**: File includes markdown message format specification (how User/Assistant messages are represented)
5. **Sample markdown provided**: At least one complete sample conversation markdown file is included in the research file

**Pass Criteria**: All 5 criteria must be met. If any fails, task is incomplete.

### ⚠️ HIGH-PRIORITY (Strongly Recommended - needed for next tasks)
1. **File naming convention**: Clear, unambiguous naming convention for conversation files documented
2. **Folder structure**: Organized hierarchy for storing multiple conversations (e.g., by month/year)
3. **Cross-reference guidance**: Documentation on how to link related conversations using Obsidian WikiLink syntax
4. **Metadata handling**: Clear explanation of how to preserve and query conversation metadata

**Pass Criteria**: At least 3 of 4 should be documented. High-priority items enable robust implementation.

### ⏭️ CAN SKIP/DEFER (Nice-to-have - can fix later)
1. **Obsidian API documentation**: References to Obsidian API (can be added in Task 3.2)
2. **Advanced metadata**: Tagging strategy, categories, or indexing systems (can be refined iteratively)
3. **Migration guide**: How to migrate conversations from other formats (can be added post-MVP)
4. **Backup strategy**: Documentation on vault backup and sync (can be addressed later)

**Skip Criteria**: These are enhancements that don't block Task 3.2 implementation.

### Recommended Testing Order:
1. **Manual research** (30-45 min): Read Obsidian docs, experiment with vault structure, test markdown format
2. **Documentation creation** (15-30 min): Write comprehensive research file with examples
3. **File verification** (5 min): Verify markdown syntax and content completeness
4. **If all MUST-PASS criteria met**: Move to Task 3.2 ✅
5. **Unit/Integration tests**: Run Jest tests to validate research file structure

## Note / Status

- Status: ⏳ PENDING
- Assigned to: [To be assigned]
- Due: [Target date]
- Dependencies: None (can start immediately)
- Blocks: Task 3.2 (ObsidianAdapter Implementation)
- Notes:
  - This is a research/documentation task - no code implementation required
  - Focus on creating clear, actionable documentation for next task
  - Include realistic examples based on actual Obsidian vault structure
  - Research file should be the single source of truth for Obsidian integration design
