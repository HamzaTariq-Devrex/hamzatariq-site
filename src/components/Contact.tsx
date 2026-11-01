import { MdArrowOutward, MdCopyright } from "react-icons/md";
import "./styles/Contact.css";
import { SERVICES } from "@/data/services";
import { SITE } from "@/lib/site";
import BookCall from "./site/BookCall";
import { TOOLS } from "@/data/tools";
import { SOLUTIONS_LINK } from "@/data/solutions";
import { EDUCATION, UNIVERSITY } from "@/data/experience";

const Contact = () => {
  return (
    <div className="contact-section section-container" id="contact">
      <div className="contact-container">
        <div className="contact-top">
          <h3>Contact</h3>
          <BookCall bare plain className="contact-book-btn" icon={<MdArrowOutward />} />
        </div>

        <div className="contact-flex">
          <div className="contact-box">
            <h4>Email</h4>
            <p>
              <a href={`mailto:${SITE.email}`} data-cursor="disable">
                {SITE.email}
              </a>
            </p>

            <h4>Where I work</h4>
            <p>{SITE.location}</p>
            <p>{SITE.timezones}</p>

            <h4>Education</h4>
            <p>
              {EDUCATION}, {UNIVERSITY.name}
            </p>
          </div>

          <div className="contact-box">
            <h4>Services</h4>
            <ul className="contact-links">
              {SERVICES.map((s) => (
                <li key={s.slug}>
                  <a href={`/services/${s.slug}`} data-cursor="disable">
                    {s.name}
                  </a>
                </li>
              ))}
              <li>
                <a href={SOLUTIONS_LINK.href} data-cursor="disable">
                  {SOLUTIONS_LINK.name}
                </a>
              </li>
              {TOOLS.map((t) => (
                <li key={t.href}>
                  <a href={t.href} data-cursor="disable">
                    {t.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="contact-box">
            <h4>Pages</h4>
            <ul className="contact-links">
              <li>
                <a href="/work" data-cursor="disable">Work</a>
              </li>
              <li>
                <a href="/about" data-cursor="disable">About</a>
              </li>
              <li>
                <a href="/blog" data-cursor="disable">Blog</a>
              </li>
              <li>
                <a href="/hire" data-cursor="disable">Hire me</a>
              </li>
              <li>
                <a href="/contact" data-cursor="disable">Contact</a>
              </li>
            </ul>
          </div>

          <div className="contact-box">
            <h4>Social</h4>
            <a href={SITE.social.github} target="_blank" rel="noreferrer" data-cursor="disable" className="contact-social">
              Github <MdArrowOutward />
            </a>
            <a href={SITE.social.whatsapp} target="_blank" rel="noreferrer" data-cursor="disable" className="contact-social">
              WhatsApp <MdArrowOutward />
            </a>
            <a href={SITE.social.instagram} target="_blank" rel="noreferrer" data-cursor="disable" className="contact-social">
              Instagram <MdArrowOutward />
            </a>
          </div>

          <div className="contact-box">
            <h2>
              Designed and Developed <br /> by <span>Hamza Tariq</span>
            </h2>
            <p className="contact-copyright">
              <MdCopyright /> {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
