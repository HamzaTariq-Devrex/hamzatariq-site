"use client";

import { useEffect, useRef, useState } from "react";

type Day = { day: string; count: number };

// Drawn at the container's real pixel width, so text stays 11px and bars stay thin at any size.
const H = 220;
const PAD = { top: 16, right: 4, bottom: 26, left: 26 };

const niceMax = (n: number) => (n <= 4 ? 4 : n <= 6 ? 6 : n <= 10 ? 10 : Math.ceil(n / 5) * 5);
const short = (day: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

/** Leads per day, one bar per day. Hover or focus a day for its exact count. */
const DailyBars = ({ days }: { days: Day[] }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const max = niceMax(Math.max(...days.map((d) => d.count)));
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = H - PAD.top - PAD.bottom;
  const step = plotW / days.length;
  const barW = Math.max(2, Math.min(18, step - 2)); // 2px surface gap between bars
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const center = (i: number) => PAD.left + i * step + step / 2;
  const last = days.length - 1;
  // A date label every 7 days plus the last day, skipping one that would crowd the last label.
  const labelled = (i: number) => i === last || (i % 7 === 0 && last - i >= 4);
  const hovered = active === null ? null : days[active];

  return (
    <div className="adm-chart" ref={wrapRef}>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label={`Leads per day for the last ${days.length} days`} onMouseLeave={() => setActive(null)}>
          {[0, max / 2, max].map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="adm-chart-grid" />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="adm-chart-axis">
                {t}
              </text>
            </g>
          ))}
          {days.map((d, i) => {
            const x = center(i) - barW / 2;
            const base = y(0);
            const top = y(d.count);
            const r = Math.min(4, barW / 2, base - top);
            return (
              <g key={d.day}>
                {d.count > 0 && (
                  // 4px rounded data end, square at the baseline
                  <path
                    d={`M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${base} Z`}
                    className={`adm-chart-bar${active === i ? " is-active" : ""}`}
                  />
                )}
                {/* Hit target: the whole column, bigger than the bar */}
                <rect
                  x={PAD.left + i * step}
                  y={PAD.top}
                  width={step}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${short(d.day)}: ${d.count} lead${d.count === 1 ? "" : "s"}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                />
                {labelled(i) && (
                  <text x={center(i)} y={H - 8} textAnchor={i === last ? "end" : i === 0 ? "start" : "middle"} className="adm-chart-axis">
                    {short(d.day)}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} className="adm-chart-baseline" />
        </svg>
      )}
      {hovered && active !== null && (
        <div
          className="adm-tooltip"
          style={{ left: Math.min(Math.max(center(active), 60), width - 60), top: y(hovered.count) - 8 }}
          role="status"
        >
          <span className="adm-tooltip-value">
            <strong>{hovered.count}</strong> lead{hovered.count === 1 ? "" : "s"}
          </span>
          <span>{short(hovered.day)}</span>
        </div>
      )}
      <table className="sr-only">
        <caption>Leads per day</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{d.day}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DailyBars;
