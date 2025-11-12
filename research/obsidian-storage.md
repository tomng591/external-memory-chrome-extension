# Obsidian Vault Storage: Research & Specification

This document provides a comprehensive analysis of Obsidian's vault structure, file format, and metadata handling. It serves as the reference specification for implementing the ObsidianAdapter in Task 3.2.

## Table of Contents
1. [Vault Structure](#vault-structure)
2. [File Format Specification](#file-format-specification)
3. [YAML Frontmatter Specification](#yaml-frontmatter-specification)
4. [Markdown Message Format](#markdown-message-format)
5. [Sample Conversation Files](#sample-conversation-files)
6. [Implementation Guidance](#implementation-guidance)
7. [References](#references)

---

## Vault Structure

### What is an Obsidian Vault?

An Obsidian vault is a local directory on a user's computer that contains all their notes and attachments. It's a file-based system where notes are stored as plain markdown (.md) files, making them portable and future-proof. The vault structure is flexible and can accommodate various organizational philosophies.

### Recommended Vault Structure for External Memory Extension

The recommended storage strategy for conversations in an Obsidian vault follows this structure:

```
my-obsidian-vault/
├── .obsidian/                    # Obsidian configuration directory (auto-managed)
│   ├── app.json                  # UI and app settings
│   ├── appearance.json           # Theme and appearance settings
│   ├── core-plugins.json         # Enabled core plugins
│   ├── community-plugins.json    # Community plugin configurations
│   └── ...                       # Other auto-generated config files
│
├── conversations/                # Root folder for all captured conversations
│   ├── 2025-11/                  # Organized by year-month
│   │   ├── 2025-11-12-10-30-45-abc123def456.md
│   │   ├── 2025-11-12-14-15-22-xyz789uvw012.md
│   │   └── 2025-11-13-09-00-00-conversations-index.md
│   │
│   ├── 2025-12/
│   │   └── ...
│   │
│   └── conversation-index.md     # Master index of all conversations
│
├── templates/                    # Optional: Templates for new conversations
│   └── conversation-template.md
│
└── README.md                     # Vault overview and instructions
```

### Key Design Decisions

1. **Folder Organization**: Conversations are stored in a dedicated `conversations/` folder with subfolders organized by YYYY-MM (year-month). This makes it easy to browse conversations by time period.

2. **File Naming Convention**: Each conversation file uses the format:
   - `YYYY-MM-DD-HH-mm-ss-{conversation-id}.md`
   - Example: `2025-11-12-10-30-45-abc123def456.md`
   - This ensures:
     - Files are sortable chronologically (YYYY-MM-DD)
     - Time precision to seconds (HH-mm-ss)
     - Unique conversation identifier for deduplication and linking
     - Filename contains all metadata at a glance

3. **Vault Root (`.obsidian/`)**: Obsidian automatically creates and manages a `.obsidian/` directory containing configuration files. Do not modify this directory programmatically.

4. **Indexing**: A master `conversation-index.md` file at the root of `/conversations/` provides an overview of all captured conversations, enabling quick browsing and searching.

---

## File Format Specification

### Overview

Each conversation is stored as a single markdown file containing:
1. **YAML Frontmatter**: Metadata about the conversation
2. **Markdown Content**: The conversation messages with user and assistant alternating

### Example File Structure

```
2025-11-12-10-30-45-abc123def456.md
├── YAML Frontmatter (lines 1-20)
├── Blank line (line 21)
└── Markdown Content (lines 22+)
```

---

## YAML Frontmatter Specification

YAML frontmatter must appear at the very top of the file, enclosed by triple dashes (`---`) on the first and last lines.

### Format

```yaml
---
id: {conversation-id}
platform: {platform-name}
model: {model-name}
created_at: {timestamp}
last_updated_at: {timestamp}
message_count: {count}
title: {conversation-title}
tags:
  - {tag1}
  - {tag2}
  - {tag3}
---
```

### Field Specifications

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `id` | string | ✅ | Unique conversation identifier (UUID or hash). Used for deduplication and cross-referencing. | `"abc123def456-7890-1234-5678-90abcdef1234"` |
| `platform` | string | ✅ | Source platform of the conversation. Must be one of: `chatgpt` or `claude` | `"chatgpt"` |
| `model` | string | ✅ | LLM model name used in conversation | `"gpt-4"`, `"claude-3-opus"`, `"gpt-4-turbo"` |
| `created_at` | number | ✅ | Unix timestamp (milliseconds) when conversation started | `1731415845000` |
| `last_updated_at` | number | ✅ | Unix timestamp (milliseconds) of last message in conversation | `1731418000000` |
| `message_count` | number | ✅ | Total number of messages (user + assistant) in conversation | `12` |
| `title` | string | ✅ | Conversation title (usually first message or custom summary) | `"How to optimize React performance"` |
| `tags` | array | ⚠️ | Auto-generated tags for categorization (platform, model, date) | `["chatgpt", "gpt-4", "nov-2025"]` |

### Notes on Fields

- **id**: Should be generated as a UUID v4 or content hash. Used to prevent duplicate saves of same conversation.
- **platform**: One of `chatgpt` or `claude`. Used for filtering and source identification.
- **model**: The exact model name as reported by the platform. Examples: `gpt-4`, `gpt-3.5-turbo`, `claude-3-opus-20240229`, etc.
- **created_at** / **last_updated_at**: Unix timestamps in milliseconds (JavaScript standard). These enable time-based sorting and analysis.
- **title**: Should be the first message (user's question) or a summarized title. Keep under 100 characters for readability.
- **tags**: Auto-generated based on platform, model, and date. Enables filtering and discovery in Obsidian.
  - Platform tag: `chatgpt` or `claude`
  - Model tag: First part of model name (e.g., `gpt-4`, `claude-3`)
  - Date tag: `{month}-{year}` format (e.g., `nov-2025`, `dec-2025`)

---

## Markdown Message Format

### Message Structure

Messages are represented as markdown sections using level 2 headings (`##`) with the following pattern:

```markdown
## {Role} — {Timestamp}

{Message Content}
```

### Format Details

- **Role**: Either `User` or `Assistant` (capitalized)
- **Timestamp**: ISO 8601 format with timezone (e.g., `2025-11-12 10:30:45 UTC`) or human-readable format
- **Message Content**: Preserved as-is from the original platform, including:
  - Plain text
  - Code blocks with syntax highlighting (```)
  - Markdown formatting (bold, italic, lists, tables)
  - Links and references
  - Line breaks and whitespace

### Example Message Format

```markdown
## User — 2025-11-12 10:30:45 UTC

How can I optimize React component rendering performance?

## Assistant — 2025-11-12 10:31:12 UTC

Here are several strategies to optimize React rendering:

1. **Use React.memo** for functional components
2. **Implement useMemo** and useCallback** hooks
3. **Code splitting** with React.lazy
4. **Virtual scrolling** for large lists

```typescript
// Example: Using React.memo
const MyComponent = React.memo(({ data }) => {
  return <div>{data}</div>;
});
```

## User — 2025-11-12 10:32:00 UTC

Can you show me a practical example with a list component?
```

### Content Preservation

- **Code blocks**: Preserve with language identifier for syntax highlighting (e.g., ````typescript`, ````python`)
- **Lists and tables**: Preserve original markdown formatting
- **Links**: Preserve as markdown links `[text](url)` if available, otherwise plain text
- **Emphasis**: Preserve bold (`**text**`) and italic (`*text*`) formatting
- **Line breaks**: Preserve as-is (single breaks become paragraph breaks)

---

## Sample Conversation Files

### Sample 1: ChatGPT Conversation

**File**: `2025-11-12-10-30-45-abc123def456.md`

```yaml
---
id: "abc123def456-7890-1234-5678-90abcdef1234"
platform: "chatgpt"
model: "gpt-4"
created_at: 1731415845000
last_updated_at: 1731419540000
message_count: 6
title: "How to optimize React component rendering performance?"
tags:
  - chatgpt
  - gpt-4
  - nov-2025
  - react
  - performance
---

## User — 2025-11-12 10:30:45 UTC

How can I optimize React component rendering performance?

## Assistant — 2025-11-12 10:31:12 UTC

Here are several strategies to optimize React rendering:

1. **Use React.memo** for functional components
2. **Implement useMemo and useCallback hooks**
3. **Code splitting** with React.lazy
4. **Virtual scrolling** for large lists

The most impactful optimization depends on your specific bottleneck. Would you like me to dive deeper into any of these?

## User — 2025-11-12 10:32:00 UTC

Can you show me a practical example with a list component?

## Assistant — 2025-11-12 10:32:45 UTC

Absolutely! Here's an optimized list component:

```typescript
import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

interface ListItem {
  id: string;
  label: string;
}

interface OptimizedListProps {
  items: ListItem[];
  onItemClick: (id: string) => void;
}

const OptimizedList = React.memo(({ items, onItemClick }: OptimizedListProps) => {
  const Row = useMemo(
    () => ({ index, style }: { index: number; style: React.CSSProperties }) => (
      <div style={style} onClick={() => onItemClick(items[index].id)}>
        {items[index].label}
      </div>
    ),
    [items, onItemClick]
  );

  return (
    <List
      height={600}
      itemCount={items.length}
      itemSize={35}
      width="100%"
    >
      {Row}
    </List>
  );
});

export default OptimizedList;
```

This uses `react-window` for virtual scrolling. Key optimizations:
- Renders only visible items
- Memoizes the Row component
- Uses useCallback for event handlers

## User — 2025-11-12 10:35:20 UTC

This is helpful! How does it compare to react-virtualized?

## Assistant — 2025-11-12 10:36:00 UTC

Great question! Here's a comparison:

| Feature | react-window | react-virtualized |
|---------|--------------|-------------------|
| Bundle Size | ~7 KB | ~65 KB |
| Learning Curve | Simpler API | More complex |
| Features | Core virtualization | Extensive (tables, grids, trees) |
| Maintenance | Actively maintained | Stable, less frequent updates |

**Recommendation**:
- Use **react-window** for simple lists/grids (best for most cases)
- Use **react-virtualized** if you need advanced features like sortable columns or complex layouts

For your use case, react-window is likely the better choice!
```

### Sample 2: Claude Conversation

**File**: `2025-11-13-14-22-10-xyz789uvw012.md`

```yaml
---
id: "xyz789uvw012-3456-7890-1234-56789abcdef0"
platform: "claude"
model: "claude-3-opus-20240229"
created_at: 1731491730000
last_updated_at: 1731495090000
message_count: 4
title: "Explain the difference between async/await and promises"
tags:
  - claude
  - claude-3
  - nov-2025
  - javascript
  - async
---

## User — 2025-11-13 14:22:10 UTC

Can you explain the difference between async/await and promises in JavaScript?

## Assistant — 2025-11-13 14:23:45 UTC

Absolutely! While `async/await` is built on top of promises, there are important differences in syntax and usage:

## Key Differences

**Promises:**
```javascript
function fetchData() {
  return fetch('/api/data')
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error(error));
}
```

**Async/Await:**
```javascript
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}
```

## Main Advantages of Async/Await

1. **More readable** - looks like synchronous code
2. **Easier error handling** - uses try/catch instead of .catch()
3. **Debuggable** - easier to step through
4. **Control flow** - clearer with multiple awaits

Both are equally powerful under the hood; async/await is just syntactic sugar over promises.

## User — 2025-11-13 14:25:00 UTC

Can you show an example with multiple sequential operations?

## Assistant — 2025-11-13 14:26:30 UTC

Here's a comparison of multiple sequential operations:

**Promise Chain:**
```javascript
function getUserProfile(userId) {
  return fetch(`/api/users/${userId}`)
    .then(res => res.json())
    .then(user => fetch(`/api/posts/${user.id}`))
    .then(res => res.json())
    .then(posts => fetch(`/api/comments/${posts[0].id}`))
    .then(res => res.json())
    .then(comments => ({ user, posts, comments }))
    .catch(error => console.error(error));
}
```

**Async/Await (Much Cleaner!):**
```javascript
async function getUserProfile(userId) {
  try {
    const userRes = await fetch(`/api/users/${userId}`);
    const user = await userRes.json();

    const postsRes = await fetch(`/api/posts/${user.id}`);
    const posts = await postsRes.json();

    const commentsRes = await fetch(`/api/comments/${posts[0].id}`);
    const comments = await commentsRes.json();

    return { user, posts, comments };
  } catch (error) {
    console.error(error);
  }
}
```

The async/await version is significantly more readable and easier to understand at a glance.
```

---

## Implementation Guidance

### For ObsidianAdapter (Task 3.2)

The following implementation points should guide the development of `src/adapters/ObsidianAdapter.ts`:

#### 1. Initialization & Configuration

The adapter should accept a vault path and validate it:

```typescript
class ObsidianAdapter {
  constructor(vaultPath: string) {
    // Validate vault path exists
    // Validate .obsidian/ directory exists
    // Initialize conversation directory structure
  }
}
```

#### 2. Directory Structure Creation

The adapter must create the required folder structure:

```typescript
async ensureStructure(): Promise<void> {
  // Create conversations/ folder if not exists
  // Create conversations/YYYY-MM/ subfolder for current month
  // Create conversation-index.md if not exists
}
```

#### 3. Message to Markdown Conversion

Implement conversion from the Message TypeScript interface (defined in Task 2.1) to markdown format:

```typescript
private messageToMarkdown(message: Message): string {
  // Format: ## {Role} — {Timestamp}
  // Convert role from 'user'/'assistant' to 'User'/'Assistant'
  // Format timestamp as ISO 8601
  // Return markdown string
}
```

#### 4. Conversation to File Conversion

Convert a conversation (array of messages) to a complete markdown file with frontmatter:

```typescript
private conversationToFile(
  conversationId: string,
  messages: Message[],
  metadata: ConversationMetadata
): string {
  // Generate YAML frontmatter
  // Convert each message to markdown
  // Combine: frontmatter + blank line + markdown content
}
```

#### 5. File Writing

Implement file writing with proper error handling:

```typescript
async save(message: Message): Promise<void> {
  // Group messages by conversationId
  // Check if conversation file already exists
  // Create or update conversation file
  // Update conversation-index.md
  // Handle file system errors gracefully
}
```

#### 6. Error Handling

- Handle case where vault path doesn't exist
- Handle permission errors when writing files
- Handle concurrent writes to same conversation (use locks if needed)
- Provide informative error messages

#### 7. Timestamp Formatting

When converting timestamps:
- Input: Unix milliseconds (from Message interface)
- Output: ISO 8601 format in markdown (e.g., `2025-11-12 10:30:45 UTC`)
- Store in frontmatter as Unix milliseconds for machine readability

#### 8. File Path Logic

```
Vault Root: /path/to/vault/
Conversation Folder: /path/to/vault/conversations/
Month Subfolder: /path/to/vault/conversations/2025-11/
Conversation File: /path/to/vault/conversations/2025-11/2025-11-12-10-30-45-abc123def456.md
```

#### 9. Conversation ID Extraction

From the content script parsers (Tasks 2.2, 2.3), the conversation ID should be:
- Extracted from the platform UI (if available)
- Generated as a hash or UUID v4 if not available
- Used consistently across all messages in the same conversation

#### 10. Testing Considerations

- Mock file system operations in unit tests
- Test with actual vault structure in integration tests
- Verify YAML frontmatter is valid and parseable
- Verify markdown format is correctly formatted
- Test concurrent message saves to same conversation

---

## References

### Official Obsidian Documentation
- Vault Structure: https://help.obsidian.md/
- YAML Front Matter: https://help.obsidian.md/Advanced+topics/YAML+front+matter
- Properties/Metadata: https://help.obsidian.md/Editing+and+formatting/Properties
- Obsidian Flavored Markdown: https://help.obsidian.md/Editing+and+formatting/Obsidian+Flavored+Markdown

### External Resources
- YAML Front Matter Guide: https://www.wundertech.net/yaml-front-matter-in-obsidian/
- Vault Organization Examples: https://stephango.com/vault
- Obsidian Community Plugins: https://obsidian.md/plugins

### Related Tasks
- Task 2.1: Define Message TypeScript Interface
- Task 2.2: Implement ChatGPT DOM Message Parser
- Task 2.3: Implement Claude DOM Message Parser
- Task 3.2: Create ObsidianAdapter Implementation

---

## Appendix: Additional Notes

### Obsidian Vault Characteristics

1. **Local & Portable**: Vault is stored locally as plain markdown files. Can be synced with Git, cloud storage, or Obsidian Sync.

2. **Flexible Organization**: No rigid folder structure required. Users can organize as they prefer (flat structure, deep hierarchy, or hybrid).

3. **Backlink-Driven Navigation**: Obsidian's strength is in connecting notes through backlinks and WikiLink syntax (`[[note-name]]`).

4. **Plugin Ecosystem**: Many plugins extend functionality (Dataview for querying, Calendar for timeline views, etc.). Our adapter doesn't need to support plugins, but should not break them.

5. **Read-Safe**: Writing to a vault file won't break Obsidian. It will automatically reload the file when focused.

### Best Practices for Adapter

1. **Idempotent Operations**: Saving the same message twice should not duplicate data.
2. **Atomic Writes**: Use temp files and rename for atomic file operations.
3. **Non-Destructive**: Don't delete or modify existing files without user consent.
4. **Respectful**: Don't write outside the designated `/conversations/` folder.
5. **Observable**: Log file operations for debugging and transparency.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-12
**Status**: Research Complete ✅
