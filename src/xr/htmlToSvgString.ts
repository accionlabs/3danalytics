/**
 * Extract or wrap DOM content into a valid SVG string for rasterization.
 *
 * Two paths:
 * 1. If the container has a Recharts <svg>, clone it with inline styles
 * 2. Otherwise (KpiCard, FunnelChart), wrap the HTML in a <foreignObject>
 */
export function htmlToSvgString(
  container: HTMLElement,
  width: number,
  height: number,
): string {
  // Try to find an existing Recharts SVG
  const svg = container.querySelector('svg.recharts-surface') as SVGSVGElement | null

  if (svg) {
    return extractSvg(svg, width, height)
  }

  // No SVG found — wrap the HTML in foreignObject
  return wrapInForeignObject(container, width, height)
}

/** Clone an SVG element and set viewBox/dimensions for rasterization */
function extractSvg(svg: SVGSVGElement, width: number, height: number): string {
  const clone = svg.cloneNode(true) as SVGSVGElement

  // Copy computed styles inline (SVG rasterization ignores stylesheets)
  inlineStyles(svg, clone)

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))

  // Preserve the original viewBox if set; otherwise derive from original dimensions
  if (!clone.getAttribute('viewBox')) {
    const w = svg.width.baseVal.value || width
    const h = svg.height.baseVal.value || height
    clone.setAttribute('viewBox', `0 0 ${w} ${h}`)
  }

  return new XMLSerializer().serializeToString(clone)
}

/** Wrap arbitrary HTML in a foreignObject SVG for rasterization */
function wrapInForeignObject(container: HTMLElement, width: number, height: number): string {
  // Clone and inline styles
  const clone = container.cloneNode(true) as HTMLElement
  inlineStylesHtml(container, clone)

  const html = new XMLSerializer().serializeToString(clone)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;background:#080c1c;font-family:system-ui,sans-serif;">
      ${html}
    </div>
  </foreignObject>
</svg>`
}

/** Recursively copy computed styles from source to clone (SVG elements) */
function inlineStyles(source: Element, clone: Element) {
  const computed = window.getComputedStyle(source)
  const styleStr = Array.from(computed)
    .filter((prop) => {
      // Only copy text/color/font properties to keep SVG size manageable
      return prop.startsWith('font') || prop.startsWith('fill') || prop.startsWith('stroke') ||
        prop === 'color' || prop === 'opacity' || prop.startsWith('text')
    })
    .map((prop) => `${prop}:${computed.getPropertyValue(prop)}`)
    .join(';')

  if (styleStr) {
    ;(clone as SVGElement | HTMLElement).setAttribute('style', styleStr)
  }

  const srcChildren = source.children
  const cloneChildren = clone.children
  for (let i = 0; i < srcChildren.length && i < cloneChildren.length; i++) {
    inlineStyles(srcChildren[i], cloneChildren[i])
  }
}

/** Recursively inline computed styles for HTML elements */
function inlineStylesHtml(source: HTMLElement, clone: HTMLElement) {
  const computed = window.getComputedStyle(source)
  clone.style.cssText = computed.cssText
  for (let i = 0; i < source.children.length && i < clone.children.length; i++) {
    inlineStylesHtml(
      source.children[i] as HTMLElement,
      clone.children[i] as HTMLElement,
    )
  }
}
