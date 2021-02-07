import React, { useState, useEffect, useRef, useCallback }  from 'react';
import useImage from 'use-image';
import boxes from './boxes.json';
import font from './font.json';

// Blend a square from template with target at displacement, and paste result in destination
function blend(source, xpos, ypos, width, height, target, xdisp, ydisp, mode, dest) {
  const sourceData = source.getContext('2d').getImageData(xpos, ypos, width, height);
  const targetData = target.getContext('2d').getImageData(xdisp, ydisp, width, height);
  const destData = dest ? dest.getContext('2d').getImageData(xdisp, ydisp, width, height) : targetData;
  const len = sourceData.data.length;
  for (let px = 0; px < len; px += 4) {
    const s = 1.0 - sourceData.data[px+1] / 255;
    const t = 1.0 - targetData.data[px+1] / 255;
    if (mode === 'diff') {
      const sRed= 1.0 - sourceData.data[px] / 255;
      const redDiff = s - sRed;
      const ss = s * s;
      const tt = t * t;
      const st = s * t;
      destData.data[px]   = (1.0 - redDiff) * 255 * (1.0 - 1.0 * ss - 1.0 * tt + 2.0 * st) + redDiff * sourceData.data[px];
      destData.data[px+1] = (1.0 - redDiff) * 255 * (1.0 - 1.0 * ss - 0.6 * tt + 1.6 * st) + redDiff * sourceData.data[px+1];
      destData.data[px+2] = (1.0 - redDiff) * 255 * (1.0 - 0.6 * ss - 1.0 * tt + 1.6 * st) + redDiff * sourceData.data[px+2];
    } else if (mode === 'maxink') {
      const result = 255 * (1.0 - Math.max(s, t));
      destData.data[px] = result;
      destData.data[px+1] = result;
      destData.data[px+2] = result;
    } else if (mode === 'overlapwarn') {
      const tRed = 1.0 - targetData.data[px] / 255;
      const adaptedSum = s + 2 * t - tRed;
      const d = Math.min(1.0, adaptedSum);
      const dRed = 2 * d - Math.min(2.0, adaptedSum);
      destData.data[px] = 255 * (1.0 - dRed);
      destData.data[px+1] = 255 * (1.0 - d);
      destData.data[px+2] = 255 * (1.0 - d);
    }
    destData.data[px+3] = 255;
  }
  (dest ? dest : target).getContext('2d').putImageData(destData, xdisp, ydisp);
}

function useImageCanvas(url) {
  const [image, imageStatus] = useImage(url);
  const [theCanvas, setTheCanvas] = useState(null);

  useEffect(() => {
    if (imageStatus === "loaded") {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      setTheCanvas(canvas);
    }
  }, [image, imageStatus]);

  return theCanvas;
}

const dpr = window.devicePixelRatio || 1;

function ImageEditor({ url }) {
  const backCanvasRef = useRef();
  const frontCanvasRef = useRef();
  const pageCanvas = useImageCanvas(url);
  const fontCanvas = useImageCanvas('font.png');
  const [displayMode, setDisplayMode] = useState('page');
  const [warnOverlap, setWarnOverlap] = useState(true);
  const [scaleFactor, setScaleFactor] = useState(0.5);
  const [selectedBox, setSelectedBox] = useState(null);
  const [draggingBox, setDraggingBox] = useState(null);

  const coords = (event) => {
    const rect = event.target.getBoundingClientRect(); 
    const x = (event.clientX - rect.left) / scaleFactor; 
    const y = (event.clientY - rect.top) / scaleFactor;
    return {x, y};
  };

  const redrawBackCanvas = useCallback(() => {
    if (pageCanvas && fontCanvas) {
      const { width, height } = pageCanvas;

      const typedCanvas = document.createElement('canvas');
      typedCanvas.width = width;
      typedCanvas.height = height;
      typedCanvas.getContext('2d').fillStyle = "#FFFFFF";
      typedCanvas.getContext('2d').fillRect(0, 0, width, height);
      for (const box of boxes) {
        const fontbox = font[box.s][box.c];
        if (fontbox) {
          const {x, y, w, h} = fontbox;
          blend(fontCanvas, x, y, w, h, typedCanvas, box.x, box.y, warnOverlap ? 'overlapwarn' : 'maxink');
        }
      }

      const blendCanvas = document.createElement('canvas');
      blendCanvas.width = width;
      blendCanvas.height = height;
      blend(typedCanvas, 0, 0, width, height, pageCanvas, 0, 0, 'diff', blendCanvas);

      const ctx = backCanvasRef.current.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.scale(scaleFactor * dpr, scaleFactor * dpr);
      if (displayMode === 'page') {
        ctx.drawImage(pageCanvas, 0, 0);        
      } else if (displayMode === 'type') {
        ctx.drawImage(typedCanvas, 0, 0);        
      } else if (displayMode === 'diff') {
        ctx.drawImage(blendCanvas, 0, 0);        
      } 
    }
  }, [fontCanvas, pageCanvas, scaleFactor, displayMode, warnOverlap]);

  useEffect(() => {
    redrawBackCanvas();
  }, [redrawBackCanvas]);

  const handleMouseDown = (event) => {
    const {x, y} = coords(event);
    for (const box of boxes) {
      const fontbox = font[box.s][box.c];
      if (fontbox) {
        if ( x >= box.x && x < box.x + fontbox.w &&
             y >= box.y && y < box.y + fontbox.h )
        {
          if (selectedBox && box === selectedBox.box) {
            setDraggingBox({ x, y, xdisp: x-box.x, ydisp: y-box.y });
          } else {
            setSelectedBox({ box, width: fontbox.w, height: fontbox.h });            
          }
          return;
        }
      }
    }
    setDraggingBox(null);
    setSelectedBox(null);
  };

  const handleMouseMove = (event) => {
    if (draggingBox) {
      if (event.buttons === 0) {
        setDraggingBox(null);        
      } else {
        const {x, y} = coords(event);
        setDraggingBox({ ...draggingBox, x, y });
      }
    }
  };

  const handleMouseUp = (event) => {
    if (draggingBox) {
      const {x, y} = coords(event);
      selectedBox.box.x = x - draggingBox.xdisp;
      selectedBox.box.y = y - draggingBox.ydisp;
      redrawBackCanvas();
      setDraggingBox(null);
    }
  };

  useEffect(() => {
    const ctx = frontCanvasRef.current.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, frontCanvasRef.current.width, frontCanvasRef.current.height);
    ctx.scale(scaleFactor * dpr, scaleFactor * dpr);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2 / scaleFactor;
    if (draggingBox) {
      ctx.strokeRect(draggingBox.x - draggingBox.xdisp, draggingBox.y - draggingBox.ydisp, selectedBox.width, selectedBox.height);
    } else if (selectedBox) {
      ctx.strokeRect(selectedBox.box.x, selectedBox.box.y, selectedBox.width, selectedBox.height);
    }
  }, [scaleFactor, selectedBox, draggingBox]);

  const scaledWidth = pageCanvas ? pageCanvas.width * scaleFactor : 0;
  const scaledHeight = pageCanvas ? pageCanvas.height * scaleFactor : 0;

  return (
    <div className="ImageEditor">
      <button onClick={() => setDisplayMode('page')}>Page</button>
      <button onClick={() => setDisplayMode('type')}>Type</button>
      <button onClick={() => setDisplayMode('diff')}>Diff</button>
      <button onClick={() => setWarnOverlap(!warnOverlap)}>Overlap warning</button>
      {
        [0.25, 0.5, 1.0].map(scale => (
          <button
            key={scale}
            onClick={() => setScaleFactor(scale)}
          >
            {`${scale * 100}%`}
          </button>
        ))
      }
      <div className="CanvasContainer">
        <canvas
          ref={backCanvasRef}
          style={{ width: scaledWidth, height: scaledHeight }}
          width={scaledWidth * dpr}
          height={scaledHeight * dpr}
        />
        <canvas
          ref={frontCanvasRef}
          style={{ width: scaledWidth, height: scaledHeight }}
          width={scaledWidth * dpr}
          height={scaledHeight * dpr}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>
    </div>
  );
}

export default ImageEditor;
