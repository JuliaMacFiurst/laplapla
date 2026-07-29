import sanitizeHtml from "sanitize-html";

const SAFE_URL_SCHEMES = ["http", "https", "mailto"];

const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "ul",
    "ol",
    "li",
    "blockquote",
    "span",
    "a",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    span: ["class", "dir", "lang"],
    p: ["class", "dir", "lang"],
  },
  allowedSchemes: SAFE_URL_SCHEMES,
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    a: (_tagName, attribs) => ({
      tagName: "a",
      attribs: {
        ...attribs,
        ...(attribs.target === "_blank" ? { rel: "noopener noreferrer" } : {}),
      },
    }),
  },
};

const SVG_TAGS = [
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "defs",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "pattern",
  "title",
  "desc",
  "text",
  "tspan",
  "use",
];

const SVG_GLOBAL_ATTRIBUTES = [
  "id",
  "class",
  "role",
  "aria-label",
  "aria-hidden",
  "viewBox",
  "preserveAspectRatio",
  "width",
  "height",
  "x",
  "y",
  "x1",
  "x2",
  "y1",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "d",
  "points",
  "transform",
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "opacity",
  "clip-path",
  "clip-rule",
  "mask",
  "offset",
  "stop-color",
  "stop-opacity",
  "gradientUnits",
  "gradientTransform",
  "spreadMethod",
  "patternUnits",
  "patternContentUnits",
  "patternTransform",
  "text-anchor",
  "dominant-baseline",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "vector-effect",
  "xmlns",
  "xmlns:xlink",
  "href",
  "xlink:href",
  "style",
  "data-*",
];

const SAFE_SVG_PAINT =
  /^(?:none|transparent|currentColor|inherit|black|silver|gray|white|maroon|red|purple|fuchsia|green|lime|olive|yellow|navy|blue|teal|aqua|#[0-9a-f]{3,8}|(?:rgb|rgba|hsl|hsla)\(\s*[-+%.,\d\s]+\)|url\(\s*#[A-Za-z_][\w:.-]*\s*\))$/i;
const SAFE_SVG_NUMBER = /^[-+]?(?:\d+|\d*\.\d+)(?:e[-+]?\d+)?(?:px|pt|pc|mm|cm|in|em|rem|%)?$/i;
const SAFE_SVG_NUMBER_LIST =
  /^[-+]?(?:\d+|\d*\.\d+)(?:e[-+]?\d+)?(?:px|pt|pc|mm|cm|in|em|rem|%)?(?:[\s,]+[-+]?(?:\d+|\d*\.\d+)(?:e[-+]?\d+)?(?:px|pt|pc|mm|cm|in|em|rem|%)?)*$/i;
const LOCAL_SVG_REFERENCE = /^url\(\s*#[A-Za-z_][\w:.-]*\s*\)$/;
const SVG_PAINT_ATTRIBUTES = new Set(["color", "fill", "stroke", "stop-color"]);
const SVG_REFERENCE_ATTRIBUTES = new Set(["clip-path", "mask", "filter"]);

const SVG_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: SVG_TAGS,
  allowedAttributes: {
    "*": SVG_GLOBAL_ATTRIBUTES,
  },
  allowedSchemes: ["https"],
  allowedSchemesAppliedToAttributes: ["href", "xlink:href"],
  allowProtocolRelative: false,
  parser: {
    lowerCaseTags: false,
    lowerCaseAttributeNames: false,
  },
  allowedStyles: {
    "*": {
      color: [SAFE_SVG_PAINT],
      display: [/^(?:inline|none)$/],
      fill: [SAFE_SVG_PAINT],
      "fill-opacity": [SAFE_SVG_NUMBER],
      "fill-rule": [/^(?:nonzero|evenodd|inherit)$/],
      marker: [/^none$/],
      opacity: [SAFE_SVG_NUMBER],
      overflow: [/^(?:visible|hidden)$/],
      stroke: [SAFE_SVG_PAINT],
      "stroke-dasharray": [SAFE_SVG_NUMBER_LIST, /^none$/],
      "stroke-dashoffset": [SAFE_SVG_NUMBER],
      "stroke-linecap": [/^(?:butt|round|square|inherit)$/],
      "stroke-linejoin": [/^(?:miter|round|bevel|inherit)$/],
      "stroke-opacity": [SAFE_SVG_NUMBER],
      "stroke-width": [SAFE_SVG_NUMBER],
      visibility: [/^(?:visible|hidden|collapse)$/],
    },
  },
  disallowedTagsMode: "discard",
  transformTags: {
    "*": (tagName, attribs) => {
      const safeAttributes = { ...attribs };

      for (const attribute of SVG_PAINT_ATTRIBUTES) {
        const value = safeAttributes[attribute];
        if (value && !SAFE_SVG_PAINT.test(value)) {
          delete safeAttributes[attribute];
        }
      }

      for (const attribute of SVG_REFERENCE_ATTRIBUTES) {
        const value = safeAttributes[attribute];
        if (value && value !== "none" && !LOCAL_SVG_REFERENCE.test(value)) {
          delete safeAttributes[attribute];
        }
      }

      return { tagName, attribs: safeAttributes };
    },
  },
  exclusiveFilter(frame) {
    if (frame.tag === "use") {
      const href = frame.attribs.href || frame.attribs["xlink:href"] || "";
      return Boolean(href && !href.startsWith("#"));
    }

    return false;
  },
};

export function sanitizeRichText(value: unknown): string {
  return sanitizeHtml(typeof value === "string" ? value : "", RICH_TEXT_OPTIONS);
}

export function sanitizeSvg(value: unknown): string {
  const clean = sanitizeHtml(typeof value === "string" ? value : "", SVG_OPTIONS);
  return /^\s*<svg(?:\s|>)/.test(clean) ? clean : "";
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
