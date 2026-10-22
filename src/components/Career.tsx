import "./styles/Career.css";

const JOBS = [
  {
    role: "Founder & Web Developer",
    company: "Devrex Digital",
    period: "2024 - Present",
    current: true,
    body: "Founded Devrex Digital, a creative web development agency built around delivering premium, fully custom websites. Successfully partnered with 45+ brands, startups, and businesses across diverse industries. Every project was crafted around the client's unique brand identity: from custom theme design and UI/UX to SEO optimization, lead generation, sales strategy, and complete web management. Helping businesses not just launch online, but grow.",
    tags: ["Custom Themes", "UI/UX", "SEO", "Lead Generation", "Sales Strategy", "Web Management"],
  },
  {
    role: "Junior Frontend Web Developer",
    company: "Ruya Solutions",
    period: "2023 - 2024",
    current: false,
    body: "Began my professional journey building real-world client websites as a Junior Frontend Developer. Worked on multiple projects using React.js, crafting responsive and visually clean interfaces. Collaborated closely with design teams to turn concepts into pixel-perfect, fully functional web experiences.",
    tags: ["React.js", "Responsive UI", "Design Collaboration"],
  },
];

const Career = () => {
  return (
    <div className="career-section section-container">
      <div className="career-container">
        <div className="career-head">
          <span className="career-eyebrow">Experience</span>
          <h2>
            My career &amp; <span>experience</span>
          </h2>
        </div>

        <div className="career-info">
          <div className="career-timeline">
            <div className="career-dot"></div>
          </div>

          {JOBS.map((job) => (
            <div className="career-info-box" key={job.company}>
              <div className="career-period">
                <span className="career-years">{job.period}</span>
                {job.current && (
                  <span className="career-now">
                    <span className="career-now-dot" aria-hidden="true" />
                    Current
                  </span>
                )}
              </div>
              <span className="career-node" aria-hidden="true" />
              <div className="career-card">
                <h3>{job.role}</h3>
                <p className="career-company">{job.company}</p>
                <p>{job.body}</p>
                <ul className="career-tags">
                  {job.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Career;
