/**
 * True when keyboard shortcuts must yield to text entry
 * (INPUT / TEXTAREA / SELECT / contentEditable).
 */
export function isEditableKeyboardTarget(
  target: EventTarget | null,
): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as {
    tagName?: string;
    isContentEditable?: boolean;
  };
  if (typeof el.tagName !== "string") return false;
  const tag = el.tagName.toUpperCase();
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable === true
  );
}

/**
 * True when the document has a non-empty text selection.
 * Used so system Copy / native PPM win over in-app clip clipboard.
 */
export function hasNonCollapsedDomTextSelection(
  getSelection: () => Selection | null = defaultGetSelection,
): boolean {
  const sel = getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  return sel.toString().length > 0;
}

/**
 * Yield Ctrl/Cmd+C/X and native context menu to the browser for editable
 * fields or when the user has selected copyable text.
 */
export function shouldAllowNativeTextClipboard(
  target: EventTarget | null,
  getSelection: () => Selection | null = defaultGetSelection,
): boolean {
  return (
    isEditableKeyboardTarget(target) ||
    hasNonCollapsedDomTextSelection(getSelection)
  );
}

function defaultGetSelection(): Selection | null {
  if (typeof window === "undefined") return null;
  return window.getSelection();
}
