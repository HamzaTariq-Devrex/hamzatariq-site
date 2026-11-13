import AmbientCanvas from "./AmbientCanvas";
import AmbientFx from "./AmbientFx";

/**
 * Site-wide background, fixed behind every page: a field of colour that keeps flowing
 * (`AmbientCanvas`, a low-resolution shader) over three CSS glows (the look without WebGL or with
 * reduced motion), a faint grid and film grain, plus `AmbientFx` (the scroll progress line and the
 * pointer glow on cards). Decorative; hidden from assistive tech.
 */
const Ambient = () => (
  <>
    <div className="ambient" aria-hidden="true">
      <span className="ambient-orb is-a" />
      <span className="ambient-orb is-b" />
      <span className="ambient-orb is-c" />
      <AmbientCanvas />
      <span className="ambient-grid" />
      <span className="ambient-grain" />
    </div>
    <AmbientFx />
  </>
);

export default Ambient;
