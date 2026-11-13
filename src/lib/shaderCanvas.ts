/**
 * Runs one fragment shader on a plain WebGL canvas (no library). Shared by the hero aurora and the
 * site-wide background. The shader gets `uRes` (pixels), `uTime` (seconds), `uMouse` (0–1, eased) and
 * `uScroll` (page scroll in screen heights).
 *
 * - `scale` is the canvas resolution per CSS pixel (soft backgrounds can go far below 1).
 * - `fps` caps the frame rate.
 * - `always` keeps drawing while the canvas is on screen and the tab is visible; drawing always stops
 *   when the canvas is off-screen or the tab is hidden.
 * Returns a stop function, or null when WebGL is not available or not hardware-accelerated.
 * `onReady` runs once the shader has compiled and the first frame is on its way.
 */
const VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";

export type ShaderOptions = { scale: () => number; fps?: number };

/** No animation for reduced motion or on low-power devices (under 4 cores / 4 GB where reported). */
export const canAnimate = () => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.hardwareConcurrency ?? 8) >= 4 && (nav.deviceMemory ?? 8) >= 4;
};

/** Calls `fn` once the page has loaded and the browser is idle. Returns a cancel function. */
export const afterLoadIdle = (fn: () => void, timeout = 1500) => {
  let cancelled = false;
  const run = () => !cancelled && fn();
  const idle = () => {
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout });
    else setTimeout(run, 300);
  };
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", idle);
  };
};

export function startShader(canvas: HTMLCanvasElement, frag: string, { scale, fps = 60 }: ShaderOptions, onReady?: () => void): (() => void) | null {
  // failIfMajorPerformanceCaveat: no context when WebGL would be drawn by the CPU (no GPU, blocked
  // driver, test tools like Lighthouse). There the shader would eat main-thread time, so the CSS
  // fallback stays instead.
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power", failIfMajorPerformanceCaveat: true });
  if (!gl) return null;
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);

  // Compiling a shader can take a few hundred milliseconds (Windows translates it to HLSL), and
  // asking for the link status waits for it on the main thread. With KHR_parallel_shader_compile the
  // browser compiles in the background and we only poll "is it done yet?", so nothing blocks.
  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  let stopped = false;
  let cleanup = () => {};

  const begin = () => {
    if (stopped || !gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uScroll = gl.getUniformLocation(prog, "uScroll");

    const resize = () => {
      const k = scale();
      const w = Math.max(1, Math.round(canvas.clientWidth * k));
      const h = Math.max(1, Math.round(canvas.clientHeight * k));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, w, h);
    };

    let mx = 0.5;
    let my = 0.5;
    let tx = 0.5;
    let ty = 0.5;
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width;
      ty = 1 - (e.clientY - r.top) / r.height;
    };

    const gap = 1000 / fps - 2;
    let raf = 0;
    let visible = true;
    let last = performance.now();
    let drawn = 0;
    let time = Math.random() * 40;
    const frame = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      raf = requestAnimationFrame(frame);
      if (now - drawn < gap) return;
      drawn = now;
      time += Math.min(0.1, (now - last) / 1000);
      last = now;
      mx += (tx - mx) * 0.05;
      my += (ty - my) * 0.05;
      gl.uniform1f(uTime, time);
      gl.uniform2f(uMouse, mx, my);
      gl.uniform1f(uScroll, window.scrollY / Math.max(1, window.innerHeight));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const wake = () => {
      last = performance.now();
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      wake();
    });
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", wake);
    resize();
    wake();

    cleanup = () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", wake);
    };
    onReady?.();
  };

  if (parallel) {
    const poll = () => {
      if (stopped) return;
      if (gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR)) begin();
      else setTimeout(poll, 60);
    };
    setTimeout(poll, 60);
  } else begin();

  return () => {
    stopped = true;
    cleanup();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}
