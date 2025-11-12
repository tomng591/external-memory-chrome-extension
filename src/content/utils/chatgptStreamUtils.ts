export type PatchOperation = {
  p?: string;
  path?: string;
  o?: string;
  op?: string;
  v?: unknown;
  value?: unknown;
};

const CONTENT_PATH_PREFIX = '/message/content/parts/';

/**
 * Attempts to pull a useful model identifier (model slug/name) from an object
 * emitted by ChatGPT's streaming payload.
 */
export function extractModelIdentifier(source: any): string | undefined {
  if (!source || typeof source !== 'object') {
    return undefined;
  }

  const candidates = [
    source.model,
    source.model_slug,
    source.modelSlug,
    source.metadata?.model,
    source.metadata?.model_slug,
    source.metadata?.modelSlug,
    source.model_name,
    source.modelName,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return undefined;
}

function normalizePatchValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null || value === undefined) {
    return '';
  }

  try {
    return JSON.stringify(value);
  } catch (_error) {
    return '';
  }
}

/**
 * Applies ChatGPT patch operations (json.v array) to the tracked assistant content.
 * Returns the updated full content string plus a flag indicating whether any
 * text mutation occurred (append/replace/prepend).
 */
export function applyContentPatchOperations(
  operations: PatchOperation[] | null | undefined,
  currentContent: string = ''
): { content: string; updated: boolean } {
  if (!operations || operations.length === 0) {
    return { content: currentContent || '', updated: false };
  }

  let nextContent = currentContent || '';
  let updated = false;

  for (const operation of operations) {
    const path = operation.p || operation.path || '';
    if (typeof path !== 'string' || !path.startsWith(CONTENT_PATH_PREFIX)) {
      continue;
    }

    const opType = (operation.o || operation.op || '').toLowerCase();
    const value = normalizePatchValue(operation.v ?? operation.value);
    if (!value) continue;

    switch (opType) {
      case 'append':
        nextContent += value;
        updated = true;
        break;
      case 'prepend':
        nextContent = value + nextContent;
        updated = true;
        break;
      case 'replace':
        nextContent = value;
        updated = true;
        break;
      default:
        // Unknown op type (replace/add/remove metadata) – ignore silently
        break;
    }
  }

  return { content: nextContent, updated };
}
