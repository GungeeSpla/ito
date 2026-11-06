// カードの名前とたとえワードを枠に収めるための、文字幅の測定。同じ文字列の結果は覚えておく
let measurer: SVGTextElement | null = null;

function textElement(): SVGTextElement {
  if (measurer?.isConnected) return measurer;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.style.visibility = 'hidden';
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('font-weight', 'bold');
  text.setAttribute('font-family', 'sans-serif');
  svg.appendChild(text);
  document.body.appendChild(svg);
  measurer = text;
  return text;
}

function measure(text: string, fontSize: number): DOMRect {
  const el = textElement();
  el.setAttribute('font-size', String(fontSize));
  el.textContent = text;
  return el.getBBox();
}

const nameCache = new Map<string, number>();

/** 名前を幅 maxWidth・高さ maxHeight に収める最大の文字の大きさ */
export function fitName(text: string, maxWidth: number, maxHeight: number, maxSize: number): number {
  const key = `${maxWidth}:${maxHeight}:${maxSize}:${text}`;
  const cached = nameCache.get(key);
  if (cached !== undefined) return cached;
  let size = 1;
  for (let candidate = maxSize; candidate >= 1; candidate--) {
    const box = measure(text, candidate);
    if (box.width <= maxWidth && box.height <= maxHeight) {
      size = candidate;
      break;
    }
  }
  nameCache.set(key, size);
  return size;
}

export interface WrappedText {
  lines: string[];
  fontSize: number;
  height: number;
}

const wrapCache = new Map<string, WrappedText>();

/** 1 文字ずつ折り返して、高さ maxHeight に収まる最大の大きさを探す */
export function wrapText(text: string, maxWidth: number, maxHeight: number, maxSize: number, lineHeight: number): WrappedText {
  const key = `${maxWidth}:${maxHeight}:${maxSize}:${lineHeight}:${text}`;
  const cached = wrapCache.get(key);
  if (cached) return cached;
  let result: WrappedText = { lines: [], fontSize: 1, height: maxHeight };
  for (let size = maxSize; size >= 1; size--) {
    const lines: string[] = [];
    let line = '';
    let width = 0;
    for (const char of text) {
      const charWidth = measure(char, size).width;
      if (width + charWidth > maxWidth) {
        lines.push(line);
        line = char;
        width = charWidth;
      } else {
        line += char;
        width += charWidth;
      }
    }
    if (line) lines.push(line);
    const height = lines.length * size * lineHeight;
    if (height <= maxHeight) {
      result = { lines, fontSize: size, height };
      break;
    }
  }
  wrapCache.set(key, result);
  return result;
}
