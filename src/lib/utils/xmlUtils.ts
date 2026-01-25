// Ensure a value is an array
export function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

// Generate a unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

// Extract text from a text node
export function getTextContent(node: any): string {
  if (node === undefined || node === null) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (node['#text'] !== undefined) return String(node['#text'])
  // Handle case where the node itself contains the text value
  if (typeof node === 'object') {
    // Check for common text node patterns
    const keys = Object.keys(node)
    if (keys.length === 0) return ''
    // If it's just attributes, return empty
    if (keys.every(k => k.startsWith('@_'))) return ''
  }
  return ''
}
