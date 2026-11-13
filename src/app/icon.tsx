import { ImageResponse } from "next/og";

// Favicon: the logo's "H." mark on the accent-gradient tile (same mark as src/components/site/Logo.tsx),
// drawn with boxes and generated at build time (no remote request).
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const bar = { position: "absolute", background: "#ffffff", borderRadius: 3.04 } as const;

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", borderRadius: 18, backgroundImage: "linear-gradient(135deg, #9a7bff, #5f45f2 50%, #3aa9ff)" }}>
        {/* "H." at 1.6x the 40px logo grid: stems and crossbar 6.08 wide (3.8 stroke), round ends. */}
        <div style={{ ...bar, left: 17.76, top: 15.36, width: 6.08, height: 33.28 }} />
        <div style={{ ...bar, left: 17.76, top: 28.96, width: 25.28, height: 6.08 }} />
        <div style={{ ...bar, left: 36.96, top: 15.36, width: 6.08, height: 33.28 }} />
        <div style={{ ...bar, left: 46.08, top: 40.32, width: 7.68, height: 7.68, borderRadius: 4 }} />
      </div>
    ),
    size,
  );
}
