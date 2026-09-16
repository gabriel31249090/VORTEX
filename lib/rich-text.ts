export type EditorCommand =
  | 'bold'
  | 'italic'
  | 'strikeThrough'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'formatBlock'
  | 'createLink'

const INLINE_TAGS: Record<'bold' | 'italic' | 'strikeThrough', string[]> = {
  bold: ['B', 'STRONG'],
  italic: ['I', 'EM'],
  strikeThrough: ['S', 'STRIKE', 'DEL'],
}

function selectionIn(root: HTMLElement) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) return null
  return { selection, range }
}

function closestElement(node: Node | null, root: HTMLElement, tags?: string[]) {
  let current: Node | null = node
  while (current && current !== root) {
    if (current instanceof HTMLElement && (!tags || tags.includes(current.tagName))) return current
    current = current.parentNode
  }
  return null
}

function unwrap(element: HTMLElement) {
  const parent = element.parentNode
  if (!parent) return
  while (element.firstChild) parent.insertBefore(element.firstChild, element)
  parent.removeChild(element)
}

function wrapRange(range: Range, tagName: string) {
  const wrapper = document.createElement(tagName)
  try {
    range.surroundContents(wrapper)
  } catch {
    wrapper.appendChild(range.extractContents())
    range.insertNode(wrapper)
  }
  return wrapper
}

function selectNodeContents(node: Node) {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(node)
  selection.removeAllRanges()
  selection.addRange(range)
}

function placeCaretAfter(node: Node) {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.setStartAfter(node)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

export function getActiveFormats(root: HTMLElement) {
  const formats = new Set<string>()
  const selection = window.getSelection()
  const anchor = selection?.anchorNode || null
  if (!anchor || !root.contains(anchor)) return formats

  for (const [command, tags] of Object.entries(INLINE_TAGS)) {
    if (closestElement(anchor, root, tags)) formats.add(command)
  }
  return formats
}

function toggleInline(root: HTMLElement, command: 'bold' | 'italic' | 'strikeThrough') {
  const state = selectionIn(root)
  if (!state) return

  const active = closestElement(state.selection.anchorNode, root, INLINE_TAGS[command])
  if (active) {
    unwrap(active)
    return
  }

  const tag = command === 'bold' ? 'strong' : command === 'italic' ? 'em' : 's'
  const wrapper = wrapRange(state.range, tag)
  selectNodeContents(wrapper)
}

function formatBlock(root: HTMLElement, tagName: string) {
  const state = selectionIn(root)
  if (!state) return

  const current = closestElement(state.selection.anchorNode, root, ['P', 'DIV', 'H2', 'H3', 'BLOCKQUOTE'])
  if (current) {
    if (current.tagName.toLowerCase() === tagName.toLowerCase()) return
    const replacement = document.createElement(tagName)
    while (current.firstChild) replacement.appendChild(current.firstChild)
    current.replaceWith(replacement)
    placeCaretAfter(replacement)
    return
  }

  const block = document.createElement(tagName)
  block.appendChild(state.range.extractContents())
  state.range.insertNode(block)
  placeCaretAfter(block)
}

function toggleList(root: HTMLElement, ordered: boolean) {
  const state = selectionIn(root)
  if (!state) return

  const existingItem = closestElement(state.selection.anchorNode, root, ['LI'])
  const existingList = existingItem?.parentElement
  if (existingItem && existingList && ['UL', 'OL'].includes(existingList.tagName)) {
    const paragraph = document.createElement('p')
    while (existingItem.firstChild) paragraph.appendChild(existingItem.firstChild)
    existingList.replaceWith(paragraph)
    placeCaretAfter(paragraph)
    return
  }

  const list = document.createElement(ordered ? 'ol' : 'ul')
  const item = document.createElement('li')
  item.appendChild(state.range.extractContents())
  if (!item.textContent?.trim()) item.appendChild(document.createElement('br'))
  list.appendChild(item)
  state.range.insertNode(list)
  placeCaretAfter(list)
}

function createLink(root: HTMLElement, rawUrl: string) {
  const state = selectionIn(root)
  if (!state) return
  const url = rawUrl.trim()
  if (!/^https?:\/\//i.test(url)) return

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'

  if (state.range.collapsed) {
    anchor.textContent = url
    state.range.insertNode(anchor)
  } else {
    anchor.appendChild(state.range.extractContents())
    state.range.insertNode(anchor)
  }
  selectNodeContents(anchor)
}

export function insertEditorText(root: HTMLElement, text: string) {
  const state = selectionIn(root)
  if (!state) return
  state.range.deleteContents()
  const node = document.createTextNode(text)
  state.range.insertNode(node)
  placeCaretAfter(node)
}

export function applyEditorCommand(root: HTMLElement, command: EditorCommand, value?: string) {
  root.focus()

  if (command === 'bold' || command === 'italic' || command === 'strikeThrough') {
    toggleInline(root, command)
    return
  }
  if (command === 'insertUnorderedList') {
    toggleList(root, false)
    return
  }
  if (command === 'insertOrderedList') {
    toggleList(root, true)
    return
  }
  if (command === 'formatBlock' && value) {
    formatBlock(root, value)
    return
  }
  if (command === 'createLink' && value) createLink(root, value)
}
