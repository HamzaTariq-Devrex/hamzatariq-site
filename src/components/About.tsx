import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./styles/About.css";
import { SERVICES } from "@/data/services";

gsap.registerPlugin(ScrollTrigger);

const STATS = [
  { value: "45+", label: "Brands helped at Devrex Digital" },
  { value: "100%", label: "Custom code, no templates" },
  { value: "Next.js", label: "+ React specialist" },
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
          I&apos;m Hamza Tariq, a full-stack developer specializing in{" "}
          <span className="about-hl">React and Next.js</span>. At Devrex Digital I&apos;ve helped build websites and web
          apps for <span className="about-hl">45+ brands</span>, from landing pages and ecommerce stores to admin
          dashboards and AI chatbots. I write everything in{" "}
          <span className="about-hl">custom code, with no templates</span>, so every site is fast, secure, SEO-ready
          and built around the business it serves.
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
            {SERVICES.map((service) => (
              <li key={service.slug}>
                <a href={`/services/${service.slug}`} data-cursor="disable">
                  {service.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default About;
