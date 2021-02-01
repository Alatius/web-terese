import React, { useState, useEffect }  from 'react';
import { Stage, Layer, Image } from 'react-konva';
import useImage from 'use-image';

function PageImage({ url, reportSize }) {
  const [image, status] = useImage(url);

  useEffect(() => {
    if (status === "loaded") {
      reportSize({ width: image.width, height: image.height });
    }
  }, [reportSize, image, status]);

  return <Image image={image} />;
};

function ImageEditor({ url }) {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [scaleFactor, setScaleFactor] = useState(0.5);

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
        <Stage
          width={imageSize.width * scaleFactor}
          height={imageSize.height * scaleFactor}
          scale={{ x: scaleFactor, y: scaleFactor }}
        >
          <Layer>
            <PageImage url={url} reportSize={setImageSize}/>
          </Layer>
        </Stage>
      </div>
    </div>
  );
}

export default ImageEditor;
