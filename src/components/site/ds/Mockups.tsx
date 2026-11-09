import Image from "next/image";

// Device frames drawn in CSS around real screenshots (next/image, lazy unless `priority`).
type Shot = { src: string; alt: string; width: number; height: number; sizes?: string; priority?: boolean };

export const Laptop = ({ src, alt, width, height, sizes = "(max-width: 760px) 90vw, 560px", priority }: Shot) => (
  <div className="x-laptop" data-clip>
    <div className="x-laptop-screen">
      <Image src={src} alt={alt} width={width} height={height} sizes={sizes} priority={priority} />
    </div>
    <div className="x-laptop-base" aria-hidden="true" />
  </div>
);

export const Phone = ({ src, alt, width, height, sizes = "200px", priority }: Shot) => (
  <div className="x-phone">
    <div className="x-phone-screen">
      <Image src={src} alt={alt} width={width} height={height} sizes={sizes} priority={priority} />
    </div>
  </div>
);

export const Browser = ({ src, alt, width, height, sizes = "(max-width: 760px) 90vw, 560px", priority, url }: Shot & { url?: string }) => (
  <div className="x-browser" data-clip>
    <div className="x-browser-bar" aria-hidden="true">
      <i />
      <i />
      <i />
      {url && <span>{url}</span>}
    </div>
    <Image src={src} alt={alt} width={width} height={height} sizes={sizes} priority={priority} />
  </div>
);
