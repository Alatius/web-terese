import React, { useState, useEffect, useRef }  from 'react';
import useImage from 'use-image';
import boxes from './boxes.json';
import font from './font.json';

// Blend a square from source1 with source2 at displacement, and paste result in target 
function blend(source1, xpos, ypos, width, height, source2, xdisp, ydisp, mode, target) {
  const srcData1 = source1.getContext('2d').getImageData(xpos, ypos, width, height);
  const srcData2 = source2.getContext('2d').getImageData(xdisp, ydisp, width, height);
  const targetData = target ? target.getContext('2d').getImageData(xdisp, ydisp, width, height) : srcData2;
  const len = srcData1.data.length;
  for (let px = 0; px < len; px += 4) {
    const a = 1.0 - (srcData1.data[px] + srcData1.data[px+1] + srcData1.data[px+2]) / (3 * 255);
    const b = 1.0 - (srcData2.data[px] + srcData2.data[px+1] + srcData2.data[px+2]) / (3 * 255);
    if (mode === 'diff') {
      targetData.data[px]   = 255 * (1.0 - 1.0*a*a - 1.0*b*b + 2.0*a*b);
      targetData.data[px+1] = 255 * (1.0 - 1.0*a*a - 0.6*b*b + 1.6*a*b);
      targetData.data[px+2] = 255 * (1.0 - 0.6*a*a - 1.0*b*b + 1.6*a*b);
    } else if (mode === 'maxink') {
      const result = 255 * (1.0 - Math.max(a, b));
      targetData.data[px] = result;
      targetData.data[px+1] = result;
      targetData.data[px+2] = result;
    }
    targetData.data[px+3] = 255;
  }
  (target ? target : source2).getContext('2d').putImageData(targetData, xdisp, ydisp);
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
  const canvasRef = useRef();
  const pageCanvas = useImageCanvas(url);
  const fontCanvas = useImageCanvas('font.png');
  const [scaleFactor, setScaleFactor] = useState(0.5);

  const handleClick = (event) => {
    let rect = event.target.getBoundingClientRect(); 
    let x = (event.clientX - rect.left) / scaleFactor; 
    let y = (event.clientY - rect.top) / scaleFactor;
  };

  useEffect(() => {
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
          blend(fontCanvas, x, y, w, h, typedCanvas, box.x, box.y, 'maxink');
        }
      }

      const blendCanvas = document.createElement('canvas');
      blendCanvas.width = width;
      blendCanvas.height = height;

      blend(typedCanvas, 0, 0, width, height, pageCanvas, 0, 0, 'diff', blendCanvas);

      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, width, height);
      ctx.scale(scaleFactor * dpr, scaleFactor * dpr);
      ctx.drawImage(blendCanvas, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }, [pageCanvas, fontCanvas, scaleFactor]);

  const scaledWidth = pageCanvas ? pageCanvas.width * scaleFactor : 0;
  const scaledHeight = pageCanvas ? pageCanvas.height * scaleFactor : 0;

  return (
    <div className="ImageEditor">
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
          ref={canvasRef}
          style={{ width: scaledWidth, height: scaledHeight }}
          width={scaledWidth * dpr}
          height={scaledHeight * dpr}
          onClick={handleClick}
        />
      </div>
    </div>
  );
}

export default ImageEditor;
