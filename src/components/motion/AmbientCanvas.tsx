"use client";

import { useEffect, useRef } from "react";
import { afterLoadIdle, canAnimate, startShader } from "@/lib/shaderCanvas";

/**
 * The moving background behind every page: a slow field of violet, blue and cyan light that keeps
 * flowing while you read and drifts with the scroll. One fragment shader on a fixed canvas, drawn at
 * a quarter of the screen resolution and 30 fps (the picture is soft, so nothing is lost and it costs
 * very little). Starts after load + idle; never for reduced motion, without WebGL or on low-power
 * devices, where the CSS glows in Theme.css stay. Stops while the tab is hidden.
 */
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uScroll;

float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
}
float fbm(vec2 p){
  float a=.5,s=0.;
  for(int i=0;i<4;i++){s+=a*noise(p);p=p*2.03+vec2(17.1,9.7);a*=.5;}
  return s;
}

void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  vec2 p=vec2(uv.x*uRes.x/uRes.y,uv.y)*1.25;
  p.y-=uScroll*0.22;
  p+=(uMouse-.5)*0.12;
  float t=uTime*0.055;
  vec2 q=vec2(fbm(p+vec2(0.,t)),fbm(p+vec2(5.2,1.3)-t));
  vec2 r=vec2(fbm(p+2.6*q+vec2(1.7,9.2)+t*1.2),fbm(p+2.6*q+vec2(8.3,2.8)-t*0.9));
  float f=fbm(p+3.*r);

  vec3 bg=vec3(0.024,0.020,0.059);
  vec3 col=bg;
  col=mix(col,vec3(0.26,0.13,0.70),smoothstep(0.38,0.86,f)*0.50);
  col=mix(col,vec3(0.10,0.24,0.74),smoothstep(0.46,0.95,r.x)*0.40);
  col+=vec3(0.10,0.52,0.72)*smoothstep(0.52,0.90,q.y*r.y*2.2)*0.16;
  // Thin bright veins where the field folds.
  col+=vec3(0.42,0.34,0.95)*pow(smoothstep(0.0,1.0,1.-abs(f-0.56)*9.),3.)*0.10;
  // Keep the middle of the screen calmer for text, and the edges dark.
  col=mix(col,bg,0.34*smoothstep(0.75,0.1,distance(uv,vec2(0.5,0.52))));
  col*=1.-0.35*smoothstep(0.55,1.15,distance(uv,vec2(0.5)));
  gl_FragColor=vec4(col,1.);
}`;

const AmbientCanvas = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !canAnimate()) return;
    let stop: (() => void) | null = null;
    const cancel = afterLoadIdle(() => {
      stop = startShader(canvas, FRAG, { scale: () => 0.25, fps: 30 }, () => canvas.parentElement?.classList.add("is-live"));
    }, 2500);
    return () => {
      cancel();
      stop?.();
      canvas.parentElement?.classList.remove("is-live");
    };
  }, []);

  return <canvas ref={ref} className="ambient-canvas" />;
};

export default AmbientCanvas;
