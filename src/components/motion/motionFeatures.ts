// Framer Motion's DOM animation features, split into their own chunk: LazyMotion loads them after
// the page has hydrated, so they never sit on the first-load critical path.
import { domAnimation } from "framer-motion";

export default domAnimation;
