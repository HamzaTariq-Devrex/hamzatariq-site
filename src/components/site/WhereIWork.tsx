import { SITE } from "@/lib/site";
import Icon from "./ds/Icon";

/** "Based in Pakistan · Working with clients worldwide" and the time zones line. */
const WhereIWork = ({ className = "" }: { className?: string }) => (
  <ul className={`x-where ${className}`.trim()}>
    <li>
      <Icon name="globe" size={16} />
      {SITE.location}
    </li>
    <li>
      <Icon name="clock" size={16} />
      {SITE.timezones}
    </li>
  </ul>
);

export default WhereIWork;
