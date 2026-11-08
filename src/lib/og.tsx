import { ImageResponse } from "next/og";
import { SITE } from "./site";

export const OG_SIZE = { width: 1200, height: 630 };

type OgProps = { eyebrow: string; title: string; subtitle?: string; footer?: string };

// Social preview images in the site's light style: off-white ground, ink type, one vermilion accent and
// the hero's glossy shapes as the motif (drawn with gradients; no remote images, so it renders offline).
const INK = "#0e0e10";
const ACCENT = "#ff4a1c";

export const renderOg = ({ eyebrow, title, subtitle, footer = "hamzatariq.site" }: OgProps) =>
  new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 72px",
          backgroundColor: "#f2f2ef",
          color: INK,
          fontFamily: "sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Motif: a glossy accent sphere and an ink capsule, top right. */}
        <div
          style={{
            position: "absolute",
            right: -70,
            top: -90,
            width: 400,
            height: 400,
            borderRadius: 400,
            backgroundImage: `radial-gradient(circle at 34% 30%, #ffb59e 0%, ${ACCENT} 42%, #b42d08 100%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 250,
            top: 220,
            width: 96,
            height: 210,
            borderRadius: 96,
            transform: "rotate(-24deg)",
            backgroundImage: "linear-gradient(110deg, #3a3a40 0%, #0e0e10 55%, #2a2a2f 100%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 16, height: 16, borderRadius: 16, background: ACCENT }} />
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: -1 }}>{SITE.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 880 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", marginBottom: 22 }}>
            <div style={{ width: 10, height: 10, borderRadius: 10, background: ACCENT }} />
            {eyebrow}
          </div>
          <div style={{ display: "flex", fontSize: title.length > 34 ? 62 : 78, fontWeight: 600, lineHeight: 1.02, letterSpacing: -3 }}>{title}</div>
          {subtitle && <div style={{ display: "flex", marginTop: 22, fontSize: 28, lineHeight: 1.4, color: "rgba(14,14,16,0.6)" }}>{subtitle}</div>}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(14,14,16,0.14)",
            paddingTop: 22,
            fontSize: 22,
            color: "rgba(14,14,16,0.6)",
          }}
        >
          <span>{SITE.jobTitle}</span>
          <span style={{ display: "flex", padding: "8px 18px", borderRadius: 100, background: INK, color: "#ffffff" }}>{footer}</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
