import { PropsWithChildren } from "react";
import { smoother } from "./Navbar";
import "./styles/Landing.css";

const goTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
  if (window.innerWidth > 1024 && smoother) {
    e.preventDefault();
    smoother.scrollTo(`#${id}`, true, "top top");
  }
};

const HeroActions = ({ className }: { className: string }) => (
  <div className={`landing-cta ${className}`}>
    <a
      href="#work"
      className="landing-btn landing-btn-primary"
      data-cursor="disable"
      onClick={(e) => goTo(e, "work")}
    >
      View my work
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </a>
    <a
      href="#contact"
      className="landing-btn landing-btn-ghost"
      data-cursor="disable"
      onClick={(e) => goTo(e, "contact")}
    >
      Let's talk
    </a>
  </div>
);

const Landing = ({ children }: PropsWithChildren) => {
  return (
    <>
      <div className="landing-section" id="landingDiv">
        <div className="landing-container">
          <div className="landing-intro">
            <div className="landing-badge">
              <span className="landing-badge-dot" aria-hidden="true" />
              Available for new projects
            </div>
            <h2>Hello! I'm</h2>
            <h1>
              HAMZA
              <br />
              <span>TARIQ</span>
            </h1>
            <HeroActions className="landing-cta-desktop" />
          </div>

          <div className="landing-info">
            <h3>A Founder & Web Developer</h3>
            <h2 className="landing-info-h2">
              <div className="landing-h2-1">Developer</div>
              <div className="landing-h2-2">Designer</div>
            </h2>

            <h2>
              <div className="landing-h2-info">Designer</div>
              <div className="landing-h2-info-1">Developer</div>
            </h2>
          </div>

          <HeroActions className="landing-cta-mobile" />
        </div>

        {children}
      </div>
    </>
  );
};

export default Landing;
