"use client";

import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import About from "./About";
import Career from "./Career";
import Contact from "./Contact";
import Cursor from "./Cursor";
import Landing from "./Landing";
import SmoothScroll from "./SmoothScroll";
import SiteHeader from "./site/SiteHeader";
import SocialIcons from "./SocialIcons";
import WhatIDo from "./WhatIDo";
import Work from "./Work";
import setSplitText from "./utils/splitText";

const TechStack = dynamic(() => import("./TechStack"), {
  ssr: false,
  loading: () => <div className="techstack" />,
});

const MainContainer = ({ children }: PropsWithChildren) => {
  const [isDesktopView, setIsDesktopView] = useState<boolean | null>(null);
  const [showTechStack, setShowTechStack] = useState(false);
  const techStackAnchorRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // The header is portalled to <body>: inside the home tree it ends up below the chat widget
  // and other fixed layers whatever its z-index.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const resizeHandler = () => {
      setSplitText();
      setIsDesktopView(window.innerWidth > 1024);
    };
    resizeHandler();
    window.addEventListener("resize", resizeHandler);
    return () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, []);

  useEffect(() => {
    if (!isDesktopView || showTechStack) return;
    const anchor = techStackAnchorRef.current;
    if (!anchor) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShowTechStack(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [isDesktopView, showTechStack]);

  return (
    <div className="container-main">
      <Cursor />
      {mounted && createPortal(<SiteHeader home />, document.body)}
      <SmoothScroll />
      <SocialIcons />
      {isDesktopView === true && children}
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <div className="container-main">
            <Landing>{isDesktopView === false && children}</Landing>
            <About />
            <WhatIDo />
            <Career />
            <Work />
            {isDesktopView && <div ref={techStackAnchorRef} />}
            {isDesktopView && showTechStack && <TechStack />}
            <Contact />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainContainer;
