import { ImageResponse } from "next/og";

// Favicon: the header wordmark's accent dot on an ink tile, generated at build time (no remote request).
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16, background: "#0e0e10" }}>
        <div style={{ width: 26, height: 26, borderRadius: 26, background: "#ff4a1c" }} />
      </div>
    ),
    size,
  );
}
