import React from "react";

type PreloaderProps = {
  images: string[];
};

const ImagePreloader: React.FC<PreloaderProps> = ({ images }) => {
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => setIdx(0), [images]);
  return (
    <div style={{ width: 0, height: 0, overflow: "hidden" }}>
      {images.map((src, sidx) => {
        // Only show the img of the current index. After it loads,
        // advance the index forward. This makes preloading sequential.
        return sidx <= idx ? (
          <img src={src} key={sidx} onLoad={() => setIdx(sidx + 1)} />
        ) : null;
      })}
    </div>
  );
};
export default ImagePreloader;
