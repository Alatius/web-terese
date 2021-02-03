import React, { useState, useEffect, useRef, useCallback }  from 'react';
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
  const backCanvasRef = useRef();
  const frontCanvasRef = useRef();
  const pageCanvas = useImageCanvas(url);
  const fontCanvas = useImageCanvas('font.png');
  const [scaleFactor, setScaleFactor] = useState(0.5);
  const [selectedBox, setSelectedBox] = useState(null);
  const [draggingBox, setDraggingBox] = useState(null);


  const coords = (event) => {
    const rect = event.target.getBoundingClientRect(); 
    const x = (event.clientX - rect.left) / scaleFactor; 
    const y = (event.clientY - rect.top) / scaleFactor;
    return {x, y};
  };

  const redrawCanvas = useCallback(() => {
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

      const ctx = backCanvasRef.current.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.scale(scaleFactor * dpr, scaleFactor * dpr);
      ctx.drawImage(blendCanvas, 0, 0);
    }
  }, [fontCanvas, pageCanvas, scaleFactor]);

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
      redrawCanvas();
      setDraggingBox(null);
    }
  };

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas, pageCanvas, fontCanvas, scaleFactor]);

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
