function getCharWidth(char: string): number {
  const code = char.codePointAt(0) || 0;

  if (code <= 0x7F) {
    return 1;
  }

  if (
    (code >= 0x1100 && code <= 0x115F) ||
    (code >= 0x232A && code <= 0x232E) ||
    (code >= 0x2E80 && code <= 0x3247 && code !== 0x303F) ||
    (code >= 0x3250 && code <= 0x4DBF) ||
    (code >= 0x4E00 && code <= 0xA4C6) ||
    (code >= 0xA960 && code <= 0xA97C) ||
    (code >= 0xAC00 && code <= 0xD7A3) ||
    (code >= 0xF900 && code <= 0xFAFF) ||
    (code >= 0xFE10 && code <= 0xFE1F) ||
    (code >= 0xFE30 && code <= 0xFE6B) ||
    (code >= 0xFF01 && code <= 0xFF60) ||
    (code >= 0xFFE0 && code <= 0xFFE6) ||
    (code >= 0x1B000 && code <= 0x1B001) ||
    (code >= 0x1F200 && code <= 0x1F251) ||
    (code >= 0x20000 && code <= 0x3FFFD)
  ) {
    return 2;
  }

  return 1;
}

export function getStringWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    width += getCharWidth(char);
  }
  return width;
}

export function padString(str: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string {
  const currentWidth = getStringWidth(str);
  const padding = Math.max(0, width - currentWidth);

  if (align === 'left') {
    return str + ' '.repeat(padding);
  } else if (align === 'right') {
    return ' '.repeat(padding) + str;
  } else {
    const leftPadding = Math.floor(padding / 2);
    const rightPadding = padding - leftPadding;
    return ' '.repeat(leftPadding) + str + ' '.repeat(rightPadding);
  }
}


export function truncateString(str: string, maxWidth: number): string {
  if (getStringWidth(str) <= maxWidth) {
    return str;
  }

  let result = '';
  let currentWidth = 0;

  for (const char of str) {
    const charWidth = getCharWidth(char);
    if (currentWidth + charWidth > maxWidth - 3) {
      break;
    }
    result += char;
    currentWidth += charWidth;
  }

  return result + '...';
}
