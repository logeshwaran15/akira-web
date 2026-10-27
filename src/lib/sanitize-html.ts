const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "UL", "OL", "LI", "BR", "DIV", "P", "SPAN"]);

/**
 * Strips everything except a small formatting allowlist (bold/italic/underline/lists)
 * and drops all attributes, so pasted or hand-crafted HTML from the rich text editor
 * can never smuggle in scripts, event handlers, or styling-based attacks.
 */
export function sanitizeRichText(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;

  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        if (!ALLOWED_TAGS.has(el.tagName)) {
          const parent = el.parentNode;
          if (parent) {
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            parent.removeChild(el);
          }
          continue;
        }
        for (const attr of Array.from(el.attributes)) {
          el.removeAttribute(attr.name);
        }
        walk(el);
      } else if (child.nodeType !== Node.TEXT_NODE) {
        node.removeChild(child);
      }
    }
  };

  walk(template.content);
  return template.innerHTML;
}

export function isRichTextEmpty(html: string): boolean {
  const template = document.createElement("template");
  template.innerHTML = html;
  return !(template.content.textContent ?? "").trim();
}
