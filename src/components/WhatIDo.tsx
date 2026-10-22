import "./styles/WhatIDo.css";

const SERVICES = [
  {
    title: "Web Developer",
    subtitle: "Modern Web Development",
    body: "I craft fast, responsive, and visually stunning websites with smooth animations and pixel-perfect design. From custom eCommerce stores to travel, restaurant, and corporate websites, built from scratch with no generic templates.",
    label: "Skillset & Tools",
    tags: [
      "React.js",
      "Next.js",
      "TypeScript",
      "JavaScript",
      "Tailwind CSS",
      "HTML5",
      "CSS3",
      "GSAP",
      "Framer Motion",
      "Custom Themes",
      "Responsive Design",
      "eCommerce",
    ],
  },
  {
    title: "Business & Growth",
    subtitle: "Beyond Just Development",
    body: "I don't just build websites, I help businesses grow online. From acquiring new clients and managing projects to SEO, hosting setup, and complete web management, I handle the full cycle so you can focus on your business.",
    label: "What I Handle",
    tags: [
      "SEO",
      "Web Management",
      "Client Management",
      "Sales",
      "Client Hunting",
      "Hosting",
      "Domains",
      "Lead Generation",
      "Project Management",
      "Brand Growth",
    ],
  },
];

const WhatIDo = () => {
  return (
    <div className="whatIDO">
      <div className="what-box what-box-title">
        <h2 className="title">
          W<span className="hat-h2">HAT</span>
          <div>
            I<span className="do-h2"> DO</span>
          </div>
        </h2>
        <p className="what-lead">Design, development, and everything it takes to grow online.</p>
      </div>
      <div className="what-box what-box-cards">
        <div className="what-box-in">
          {SERVICES.map((service, i) => (
            <article className="what-card" key={service.title} tabIndex={0}>
              <div className="what-card-top">
                <span className="what-card-num">0{i + 1}</span>
                <span className="what-card-toggle" aria-hidden="true" />
              </div>
              <h3>{service.title}</h3>
              <h4>{service.subtitle}</h4>
              <p>{service.body}</p>
              <div className="what-hidden">
                <div className="what-hidden-in">
                  <h5>{service.label}</h5>
                  <ul className="what-tags">
                    {service.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WhatIDo;
