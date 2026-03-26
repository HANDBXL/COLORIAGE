export const floodFill = (
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  fillColorStr: string,
  tolerance: number = 20
) => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Convert hex or rgb to [r, g, b] array
  const parseColor = (color: string) => {
    let r = 0, g = 0, b = 0;
    if (color.startsWith('#')) {
      if (color.length === 4) {
        r = parseInt(color[1] + color[1], 16);
        g = parseInt(color[2] + color[2], 16);
        b = parseInt(color[3] + color[3], 16);
      } else {
        r = parseInt(color.slice(1, 3), 16);
        g = parseInt(color.slice(3, 5), 16);
        b = parseInt(color.slice(5, 7), 16);
      }
    } else if (color.startsWith('rgb')) {
      const match = color.match(/\d+/g);
      if (match && match.length >= 3) {
        r = parseInt(match[0]);
        g = parseInt(match[1]);
        b = parseInt(match[2]);
      }
    }
    return [r, g, b, 255]; // alpha default 255
  };

  const fillColor = parseColor(fillColorStr);
  
  // Math.floor to ensure integers based on device pixel ratio if any
  x = Math.floor(x);
  y = Math.floor(y);
  
  const startPos = (y * width + x) * 4;

  const startR = data[startPos];
  const startG = data[startPos + 1];
  const startB = data[startPos + 2];
  const startA = data[startPos + 3];

  // If clicked color is identical to fill color, do nothing
  if (
    startR === fillColor[0] &&
    startG === fillColor[1] &&
    startB === fillColor[2] &&
    startA === fillColor[3]
  ) {
    return;
  }

  // Matching color using Euclidean distance or basic difference for antialiasing tolerance
  const matchStartColor = (pixelPos: number) => {
    const r = data[pixelPos];
    const g = data[pixelPos + 1];
    const b = data[pixelPos + 2];
    const a = data[pixelPos + 3];

    // For absolute flat matching:
    if (tolerance === 0) {
      return r === startR && g === startG && b === startB && a === startA;
    }
    
    // For tolerance (like filling near anti-aliased black lines)
    return (
      Math.abs(r - startR) <= tolerance &&
      Math.abs(g - startG) <= tolerance &&
      Math.abs(b - startB) <= tolerance &&
      Math.abs(a - startA) <= tolerance
    );
  };

  const colorPixel = (pixelPos: number) => {
    data[pixelPos] = fillColor[0];
    data[pixelPos + 1] = fillColor[1];
    data[pixelPos + 2] = fillColor[2];
    data[pixelPos + 3] = fillColor[3];
  };

  const pixelStack: [number, number][] = [[x, y]];

  while (pixelStack.length > 0) {
    const po = pixelStack.pop();
    if (!po) continue;
    const currX = po[0];
    let currY = po[1];
    let pixelPos = (currY * width + currX) * 4;

    while (currY >= 0 && matchStartColor(pixelPos)) {
      currY--;
      pixelPos -= width * 4;
    }
    pixelPos += width * 4;
    currY++;

    let reachLeft = false;
    let reachRight = false;

    while (currY < height && matchStartColor(pixelPos)) {
      colorPixel(pixelPos);

      if (currX > 0) {
        if (matchStartColor(pixelPos - 4)) {
          if (!reachLeft) {
            pixelStack.push([currX - 1, currY]);
            reachLeft = true;
          }
        } else if (reachLeft) {
          reachLeft = false;
        }
      }

      if (currX < width - 1) {
        if (matchStartColor(pixelPos + 4)) {
          if (!reachRight) {
            pixelStack.push([currX + 1, currY]);
            reachRight = true;
          }
        } else if (reachRight) {
          reachRight = false;
        }
      }

      currY++;
      pixelPos += width * 4;
    }
  }

  ctx.putImageData(imgData, 0, 0);
};
