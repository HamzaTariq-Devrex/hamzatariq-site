import { ImageResponse } from "next/og";
import { SITE } from "./site";

export const OG_SIZE = { width: 1200, height: 630 };

type OgProps = { eyebrow: string; title: string; subtitle?: string; footer?: string };

export const renderOg = ({ eyebrow, title, subtitle, footer = "hamzatariq.site" }: OgProps) =>
  new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: "#0a0e17",
          backgroundImage: "radial-gradient(circle at 85% 0%, rgba(45,212,191,0.24), rgba(10,14,23,0) 55%)",
          color: "#f1f5f9",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SITE.logo} alt="" width={234} height={96} style={{ margin: "-30px -36px" }} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 20px",
              borderRadius: 100,
              border: "1px solid rgba(255,255,255,0.14)",
              fontSize: 22,
              color: "rgba(226,232,240,0.8)",
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: 12, background: "#22c55e" }} />
            Available for new projects
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#2dd4bf",
              marginBottom: 20,
            }}
          >
            {eyebrow}
          </div>
          <div style={{ display: "flex", fontSize: title.length > 34 ? 64 : 80, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ display: "flex", marginTop: 24, fontSize: 28, lineHeight: 1.4, color: "rgba(226,232,240,0.7)", maxWidth: 960 }}>
              {subtitle}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            paddingTop: 24,
            fontSize: 24,
            color: "rgba(226,232,240,0.6)",
          }}
        >
          <span>{SITE.name}, {SITE.jobTitle}</span>
          <span style={{ color: "#5eead4" }}>{footer}</span>
        </div>
      </div>
    ),
    OG_SIZE
  );
