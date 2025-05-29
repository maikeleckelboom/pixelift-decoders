export function sanitizeSVGElement(input: SVGElement): string {
  const serializer = new XMLSerializer();
  const parser = new DOMParser();

  const str = serializer.serializeToString(input);
  const doc = parser.parseFromString(str, 'image/svg+xml');
  const svg = doc.documentElement;

  if (!svg || svg.nodeName !== 'svg') {
    throw new Error('Input is not a valid SVG element');
  }

  const bannedTags = ['script', 'style', 'foreignObject'];
  for (const tag of bannedTags) {
    for (const el of Array.from(svg.querySelectorAll(tag))) {
      el.remove();
    }
  }

  const isDangerousAttr = (name: string, value: string): boolean => {
    const lcName = name.toLowerCase();
    const lcValue = value.toLowerCase();
    return (
      lcName.startsWith('on') ||
      lcValue.startsWith('javascript:') ||
      lcValue.includes('data:text/html') ||
      lcValue.includes('<script')
    );
  };

  for (const el of [svg, ...Array.from(svg.children)]) {
    for (const attr of Array.from(el.attributes)) {
      if (isDangerousAttr(attr.name, attr.value)) {
        el.removeAttribute(attr.name);
      }
    }
  }

  return new XMLSerializer().serializeToString(svg);
}
