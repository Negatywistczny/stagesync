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
