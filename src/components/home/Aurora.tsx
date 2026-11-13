"use client";

import { useEffect, useRef } from "react";
import { afterLoadIdle, canAnimate, startShader } from "@/lib/shaderCanvas";

/**
 * Hero background: layered silk waves in the accent colours, drawn by one small fragment shader on a
 * plain WebGL canvas (src/lib/shaderCanvas.ts; no library, so it adds almost nothing to the bundle). The waves drift on their
 * own and lean towards the pointer.
 *
 * The CSS gradient on `.hero-bg` is what the server HTML shows; the canvas fades in over it once the
 * page has loaded and the browser is idle. It never starts for reduced motion, without WebGL, or on
 * low-power devices (fewer than 4 cores / 4 GB where reported). Resolution is capped (DPR 1.5 on
 * desktop, 1 on phones) and drawing stops while the hero is off-screen or the tab is hidden.
 */
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;

float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
}

void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  float asp=uRes.x/uRes.y;
  float x=uv.x*asp;
  vec3 col=vec3(0.024,0.020,0.059);
  // A faint violet haze high up, so the top of the hero is not flat.
  col+=vec3(0.10,0.05,0.26)*smoothstep(1.1,0.2,distance(uv,vec2(0.72,1.05)))*0.55;

  float lean=(uMouse.y-0.5)*0.07;
  for(int i=0;i<6;i++){
    float fi=float(i);
    float t=uTime*(0.045+0.012*fi);
    float pull=exp(-pow((uv.x-uMouse.x)*2.6,2.))*lean;
    float h=0.66-fi*0.098
      +0.085*sin(x*1.15+t*3.1+fi*1.9)
      +0.050*sin(x*2.45-t*2.3+fi*3.1)
      +0.110*(noise(vec2(x*0.9+fi*7.31,t*1.4+fi))-0.5)
      +pull*(1.-fi*0.12);
    float d=h-uv.y;
    float body=smoothstep(0.,0.006,d);
    float depth=clamp(d/0.42,0.,1.);
    float hue=0.5+0.5*sin(x*1.1+fi*1.37+t*2.2);
    vec3 base=mix(vec3(0.33,0.15,0.86),vec3(0.10,0.27,0.92),hue);
    vec3 fill=base*(0.78-0.66*depth);
    // Silk folds: soft bands that follow the crest.
    float fold=0.5+0.5*sin(d*26.+x*2.6+noise(vec2(x*2.2,fi*3.+t*2.))*5.);
    fill+=vec3(0.50,0.44,1.0)*pow(fold,5.)*(1.-depth)*0.34;
    // Rim light on the crest: cyan drifting to pink.
    vec3 rim=mix(vec3(0.30,0.78,1.0),vec3(1.0,0.56,0.92),0.5+0.5*sin(x*1.9+fi*2.3+t*4.2));
    col=mix(col,fill,body*(0.62+0.06*fi));
    col+=rim*exp(-d*70.)*body*0.85;
    col+=rim*exp(-abs(d)*20.)*(1.-body)*0.085;
  }
  // Fade into the page colour at the very bottom and dither away banding.
  col=mix(col,vec3(0.024,0.020,0.059),smoothstep(0.16,0.,uv.y));
  col+=(hash(gl_FragCoord.xy+fract(uTime))-0.5)/255.;
  gl_FragColor=vec4(col,1.);
}`;

const Aurora = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !canAnimate()) return;
    let stop: (() => void) | null = null;
    const phone = window.matchMedia("(max-width: 760px)").matches;
    // After load + idle: the canvas never competes with the first paint.
    const cancel = afterLoadIdle(() => {
      stop = startShader(canvas, FRAG, { scale: () => Math.min(window.devicePixelRatio || 1, phone ? 1 : 1.5) }, () => canvas.classList.add("is-live"));
    });
    return () => {
      cancel();
      stop?.();
    };
  }, []);

  return <canvas ref={ref} className="aurora" aria-hidden="true" />;
};

export default Aurora;
