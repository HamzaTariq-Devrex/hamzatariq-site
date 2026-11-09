// Shimmer Button, ported from Magic UI (magicui.design/docs/components/shimmer-button): a light spark
// that slides and spins around the pill's edge. The layers go inside any button or link that has the
// `shimmer-btn` class (BookCall, the audit link), so the real <a>/<Link> and its tracking stay.
// CSS in Ui.css (`.shimmer-*`, keyframes `shimmer-slide`, `spin-around`); off with reduced motion.
const ShimmerLayers = () => (
  <>
    <span className="shimmer-spark-wrap" aria-hidden="true">
      <span className="shimmer-spark" />
    </span>
    <span className="shimmer-highlight" aria-hidden="true" />
    <span className="shimmer-backdrop" aria-hidden="true" />
  </>
);

export default ShimmerLayers;
