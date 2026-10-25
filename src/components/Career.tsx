import "./styles/Career.css";
import { JOBS } from "@/data/experience";

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
