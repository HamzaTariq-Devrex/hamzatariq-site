import { useEffect, useRef, useState } from "react";
import "./styles/Loading.css";
import { useLoading } from "../context/LoadingProvider";

const NAME = "Hamza Tariq";

const Loading = ({ percent }: { percent: number }) => {
  const { setIsLoading } = useLoading();
  const [stage, setStage] = useState<"loading" | "done" | "exit">("loading");
  const [complete, setComplete] = useState(false);
  const targetRef = useRef(0);
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  targetRef.current = Math.min(percent, 100);

  useEffect(() => {
    let shown = 0;
    let raf = 0;
    const tick = () => {
      const target = targetRef.current;
      const diff = target - shown;
      shown = diff > 0 ? Math.min(target, shown + Math.max(diff * 0.08, 0.15)) : shown;
      if (countRef.current) countRef.current.textContent = String(Math.floor(shown)).padStart(3, "0");
      if (barRef.current) barRef.current.style.transform = `scaleX(${shown / 100})`;
      if (shown >= 100) {
        setComplete(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!complete) return;
    const fxPromise = import("./utils/initialFX");
    const t1 = setTimeout(() => setStage("done"), 200);
    const t2 = setTimeout(() => {
      setStage("exit");
      fxPromise.then((m) => m.initialFX?.());
    }, 650);
    const t3 = setTimeout(() => setIsLoading(false), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [complete]);

  return (
    <div className={`preloader preloader-${stage}`}>
      <div className="preloader-curtain">
        <div className="preloader-inner">
          <header className="preloader-header">
            <img
              src="https://dataofclient.nyc3.cdn.digitaloceanspaces.com/Portfolio/Hamza%20Tariq%20Portfolio%20Logo.png"
              alt="Hamza Tariq"
              className="preloader-logo"
            />
            <span className="preloader-tag">Portfolio &copy;{new Date().getFullYear()}</span>
          </header>

          <div className="preloader-center">
            <span className="preloader-eyebrow">
              <span>Web Developer &amp; Designer</span>
            </span>
            <h1 className="preloader-name">
              <span>{NAME}</span>
            </h1>
          </div>

          <footer className="preloader-footer">
            <span className="preloader-status">
              <span>{complete ? "Welcome" : "Loading"}</span>
            </span>
            <span className="preloader-count">
              <span ref={countRef}>000</span>
            </span>
          </footer>

          <div className="preloader-bar">
            <div className="preloader-bar-fill" ref={barRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loading;

export const setProgress = (setLoading: (value: number) => void) => {
  let percent: number = 0;

  let interval = setInterval(() => {
    if (percent <= 50) {
      percent = percent + Math.round(Math.random() * 8);
      setLoading(percent);
    } else {
      clearInterval(interval);
      interval = setInterval(() => {
        percent = percent + 1;
        setLoading(percent);
        if (percent > 91) {
          clearInterval(interval);
        }
      }, 400);
    }
  }, 60);

  function clear() {
    clearInterval(interval);
    setLoading(100);
  }

  function loaded() {
    clearInterval(interval);
    percent = 100;
    setLoading(100);
    return Promise.resolve(percent);
  }

  return { loaded, percent, clear };
};
