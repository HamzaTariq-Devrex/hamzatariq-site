import Logo from "./Logo";

/**
 * Preloader: a dark curtain where the logo draws itself (the H, then the dot, then the name wipes in),
 * then the curtain slides up and the page is there (the home hero lines fly in as it lifts), in
 * about 1.9 s. Shown once per browser session.
 *
 * Pure CSS (Theme.css `.preloader`): the whole sequence is one timed animation, so it needs no
 * JavaScript, can never get stuck, and the page under it is already rendered (the largest paint is
 * not delayed). `PRELOADER_SCRIPT` runs in <head> and adds `pre-skip` to <html> on later page loads
 * in the same session; reduced motion skips it too.
 */
export const PRELOADER_SCRIPT = `try{if(sessionStorage.getItem("pre"))document.documentElement.classList.add("pre-skip");else sessionStorage.setItem("pre","1")}catch(e){}`;

const Preloader = () => (
  <div className="preloader" aria-hidden="true">
    <div className="preloader-inner">
      <Logo size={72} draw />
    </div>
  </div>
);

export default Preloader;
