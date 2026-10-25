import { MdArrowOutward, MdCopyright } from "react-icons/md";
import "./styles/Contact.css";
import { SERVICES } from "@/data/services";
import { SITE } from "@/lib/site";

const Contact = () => {
  return (
    <div className="contact-section section-container" id="contact">
      <div className="contact-container">
        <div className="contact-top">
          <h3>Contact</h3>
          <a href={SITE.bookingUrl ?? "/contact"} className="contact-book-btn" data-cursor="disable">
            Book a free call
            <MdArrowOutward />
          </a>
        </div>

        <div className="contact-flex">
          <div className="contact-box">
            <h4>Email</h4>
            <p>
              <a href={`mailto:${SITE.email}`} data-cursor="disable">
                {SITE.email}
              </a>
            </p>

            <h4>Education</h4>
            <p>BSc in Artificial Intelligence</p>
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
