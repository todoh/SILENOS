// fn_graphics_canvas.js
// Módulo de Renderizado 2D y Gráficos Canvas

export function fitCanvasToParent(canvas, aspectRatio = null) {
  const parent = canvas.parentElement;
  if (!parent) return;

  const parentWidth = parent.clientWidth;
  const parentHeight = parent.clientHeight;

  if (aspectRatio) {
    let width = parentWidth;
    let height = parentWidth / aspectRatio;

    if (height > parentHeight) {
      height = parentHeight;
      width = parentHeight * aspectRatio;
    }

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  } else {
    canvas.style.width = '100%';
    canvas.style.height = '100%';
  }
}

export function clearCanvas(ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

export function drawRotatedSprite(ctx, img, x, y, angle = 0, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

export function drawGradientRect(ctx, x, y, w, h, colors = [], angle = 0) {
  const rad = angle * (Math.PI / 180);
  const x2 = x + Math.cos(rad) * w;
  const y2 = y + Math.sin(rad) * h;

  const gradient = ctx.createLinearGradient(x, y, x2, y2);
  colors.forEach((color, idx) => {
    const stop = idx / (colors.length - 1 || 1);
    gradient.addColorStop(stop, color);
  });

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

export function drawRoundedRect(ctx, x, y, w, h, radius = 5, fill = true, stroke = false) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
  ctx.restore();
}

export function drawProceduralCircle(ctx, x, y, radius, strokeColor = null, fillColor = null) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
  }
  ctx.restore();
}

export function getCanvasPixelColor(ctx, x, y) {
  const pixel = ctx.getImageData(x, y, 1, 1).data;
  return {
    r: pixel[0],
    g: pixel[1],
    b: pixel[2],
    a: pixel[3] / 255,
    rgba: `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${(pixel[3] / 255).toFixed(2)})`
  };
}

export function exportCanvasToBlob(canvas, type = 'image/png', quality = 0.92) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

export function applyCanvasFilter(ctx, filterString) {
  ctx.filter = filterString;
}

export function createTileMapRenderer(ctx, mapData, tileSize, spritesheet) {
  return function renderTileMap(offsetX = 0, offsetY = 0) {
    const rows = mapData.length;
    for (let r = 0; r < rows; r++) {
      const cols = mapData[r].length;
      for (let c = 0; c < cols; c++) {
        const tileIndex = mapData[r][c];
        if (tileIndex < 0) continue;

        const tilesPerRow = Math.floor(spritesheet.width / tileSize);
        const sx = (tileIndex % tilesPerRow) * tileSize;
        const sy = Math.floor(tileIndex / tilesPerRow) * tileSize;

        ctx.drawImage(
          spritesheet,
          sx, sy, tileSize, tileSize,
          (c * tileSize) + offsetX, (r * tileSize) + offsetY, tileSize, tileSize
        );
      }
    }
  };
}