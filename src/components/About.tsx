import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./styles/About.css";

gsap.registerPlugin(ScrollTrigger);

const STATS = [
  { value: "45+", label: "Brands & clients served" },
  { value: "100%", label: "Custom-coded, no templates" },
  { value: "React", label: "+ Tailwind CSS stack" },
];

const SPECIALTIES = [
  "eCommerce stores",
  "Corporate websites",
  "Travel agency platforms",
  "Restaurant websites",
];

const About = () => {
  useEffect(() => {
    const anim = gsap.fromTo(
      ".about-extra > *",
      { autoAlpha: 0, y: 40 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.12,
        delay: 0.4,
        scrollTrigger: {
          trigger: ".about-section",
          start: window.innerWidth > 1024 ? "20% 60%" : "top 70%",
          toggleActions: "play none none reverse",
        },
      }
    );
    return () => {
      anim.scrollTrigger?.kill();
      anim.kill();
    };
  }, []);

  return (
    <div className="about-section" id="about">
      <div className="about-me">
        <h3 className="title">About Me</h3>
        <p className="para">
          I'm a Founder and Web Developer &amp; Designer with hands-on experience
          working with <span className="about-hl">45+ brands and clients</span>{" "}
          across multiple industries. I specialize in building modern,
          high-performance websites using{" "}
          <span className="about-hl">React and Tailwind CSS</span>: custom
          eCommerce stores, corporate websites, travel agency platforms, and
          restaurant websites. My builds go beyond templates, delivering fully
          custom themes and experiences that{" "}
          <span className="about-hl">outperform Shopify and WordPress</span> in
          both speed and design flexibility.
        </p>
        <div className="about-extra">
          <div className="about-stats">
            {STATS.map((stat) => (
              <div className="about-stat" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
          <ul className="about-tags">
            {SPECIALTIES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default About;
