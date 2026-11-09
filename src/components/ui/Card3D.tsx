"use client";

// 3D Card Effect, ported from Aceternity UI (ui.aceternity.com/components/3d-card-effect): the card
// tilts towards the mouse (rotateX/Y, perspective 1000px) and its layers lift (translateZ) while
// hovered. Adapted: mouse only (touch keeps the flat card), transform only, nothing tilts with reduced
// motion, and the tilt is written in one rAF per frame. CSS in Ui.css (`.card3d`).
import { createContext, useContext, useEffect, useRef, useState } from "react";

const MouseEnterContext = createContext<boolean>(false);

const canTilt = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const CardContainer = ({ children, className = "", containerClassName = "" }: { children: React.ReactNode; className?: string; containerClassName?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const [entered, setEntered] = useState(false);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !entered) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / 25;
    const y = (e.clientY - top - height / 2) / 25;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => (el.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`));
  };
  const onLeave = () => {
    cancelAnimationFrame(frame.current);
    setEntered(false);
    if (ref.current) ref.current.style.transform = "rotateY(0deg) rotateX(0deg)";
  };

  return (
    <MouseEnterContext.Provider value={entered}>
      <div className={`card3d-wrap ${containerClassName}`.trim()}>
        <div ref={ref} className={`card3d ${className}`.trim()} onMouseEnter={() => canTilt() && setEntered(true)} onMouseMove={onMove} onMouseLeave={onLeave}>
          {children}
        </div>
      </div>
    </MouseEnterContext.Provider>
  );
};

export const CardBody = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`card3d-body ${className}`.trim()}>{children}</div>
);

type ItemProps = {
  children: React.ReactNode;
  className?: string;
  translateZ?: number;
  translateY?: number;
  rotateZ?: number;
};

export const CardItem = ({ children, className = "", translateZ = 0, translateY = 0, rotateZ = 0 }: ItemProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const entered = useContext(MouseEnterContext);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.transform = entered ? `translateY(${translateY}px) translateZ(${translateZ}px) rotateZ(${rotateZ}deg)` : "";
  }, [entered, translateZ, translateY, rotateZ]);
  return (
    <div ref={ref} className={`card3d-item ${className}`.trim()}>
      {children}
    </div>
  );
};
