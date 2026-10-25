import "./styles/WhatIDo.css";
import { SERVICES, formatPrice } from "@/data/services";

const WhatIDo = () => {
  return (
    <div className="whatIDO" id="services">
      <div className="what-box what-box-title">
        <h2 className="title">
          W<span className="hat-h2">HAT</span>
          <div>
            I<span className="do-h2"> DO</span>
          </div>
        </h2>
        <p className="what-lead">Websites, dashboards, AI chatbots and SEO, all in custom code.</p>
      </div>
      <div className="what-box what-box-cards">
        <div className="what-box-in">
          <ul className="what-list">
            {SERVICES.map((service, i) => (
              <li key={service.slug}>
                <a href={`/services/${service.slug}`} className="what-item" data-cursor="disable">
                  <span className="what-item-num">0{i + 1}</span>
                  <span className="what-item-text">
                    <span className="what-item-title">{service.name}</span>
                    <span className="what-item-desc">{service.summary}</span>
                  </span>
                  <span className="what-item-price">
                    <span>From</span>
                    {formatPrice(service.pricing[0])}
                  </span>
                  <svg className="what-item-arrow" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
          <a href="/services" className="what-all" data-cursor="disable">
            All services and pricing →
          </a>
        </div>
      </div>
    </div>
  );
};

export default WhatIDo;
