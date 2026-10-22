import { Link } from "react-router-dom";
import PageShell from "./PageShell";

const NotFound = () => (
  <PageShell title="Page not found | Hamza Tariq">
    <section className="page-hero page-404">
      <span className="page-eyebrow">404</span>
      <h1>
        Page not <span>found</span>
      </h1>
      <p>The page you're looking for doesn't exist or has moved.</p>
      <div className="project-actions">
        <a href="/" className="page-btn page-btn-primary">
          Back to home
        </a>
        <Link to="/work" className="page-btn page-btn-ghost">
          See my work
        </Link>
      </div>
    </section>
  </PageShell>
);

export default NotFound;
