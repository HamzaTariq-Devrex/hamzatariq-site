import { ImageResponse } from "next/og";

// Favicon: the "HT" monogram from the header wordmark, generated at build time (no remote request).
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 16,
          background: "linear-gradient(140deg, #5eead4, #2dd4bf)",
          color: "#04221f",
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: -1,
        }}
      >
        HT
      </div>
    ),
    size,
  );
}
