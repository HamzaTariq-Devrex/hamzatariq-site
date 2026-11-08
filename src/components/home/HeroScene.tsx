"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Hero WebGL scene (React Three Fiber): glossy spheres and capsules in the accent colour and neutral
 * tones, floating gently. Simple physics: each shape springs back to its home position, the cursor
 * pushes shapes away, and shapes bounce off each other. Loaded lazily after first paint by HeroVisual;
 * DPR capped at 1.5; rendering stops when `running` is false (off-screen or hidden tab).
 */
type Body = {
  kind: "sphere" | "capsule";
  r: number;
  len: number;
  tone: "accent" | "white" | "ink" | "grey";
  home: THREE.Vector3;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  spin: THREE.Vector3;
  phase: number;
};

// Composition: a loose cluster weighted to the right, a few accent pieces leading the eye.
const LAYOUT: Omit<Body, "pos" | "vel" | "rot" | "spin" | "phase">[] = [
  { kind: "sphere", r: 1.35, len: 0, tone: "accent", home: new THREE.Vector3(1.2, 0.4, 0) },
  { kind: "capsule", r: 0.62, len: 1.7, tone: "white", home: new THREE.Vector3(-1.6, 1.3, -0.6) },
  { kind: "sphere", r: 0.85, len: 0, tone: "ink", home: new THREE.Vector3(3.3, -1.2, 0.4) },
  { kind: "capsule", r: 0.5, len: 1.4, tone: "accent", home: new THREE.Vector3(-0.6, -1.7, 0.8) },
  { kind: "sphere", r: 0.7, len: 0, tone: "white", home: new THREE.Vector3(3.5, 1.7, -0.8) },
  { kind: "sphere", r: 0.48, len: 0, tone: "accent", home: new THREE.Vector3(-2.9, -0.6, 0.6) },
  { kind: "capsule", r: 0.42, len: 1.2, tone: "grey", home: new THREE.Vector3(0.9, 2.3, -1.2) },
  { kind: "sphere", r: 0.55, len: 0, tone: "grey", home: new THREE.Vector3(-3.4, 1.9, -1.4) },
  { kind: "sphere", r: 0.36, len: 0, tone: "ink", home: new THREE.Vector3(1.9, -2.4, -0.4) },
];

const TONES = { white: "#f7f7f4", ink: "#18181b", grey: "#b9bab6" } as const;

const Environment = () => {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
};

const Shapes = ({ accent }: { accent: string }) => {
  const { viewport, camera } = useThree();
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const bodies = useMemo<Body[]>(
    () =>
      LAYOUT.map((b) => ({
        ...b,
        home: b.home.clone(),
        // Start at rest (matching the static image the scene replaces), with a tiny drift.
        pos: b.home.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, 0)),
        vel: new THREE.Vector3(),
        rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
        spin: new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.2),
        phase: Math.random() * Math.PI * 2,
      })),
    [],
  );
  const materials = useMemo(
    () => ({
      accent: new THREE.MeshPhysicalMaterial({ color: accent, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12 }),
      white: new THREE.MeshPhysicalMaterial({ color: TONES.white, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 }),
      ink: new THREE.MeshPhysicalMaterial({ color: TONES.ink, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }),
      grey: new THREE.MeshPhysicalMaterial({ color: TONES.grey, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    }),
    [accent],
  );
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  const pointer = useRef(new THREE.Vector3(999, 999, 0));
  const target = useRef(new THREE.Vector3());
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const t = state.clock.elapsedTime;
    // Pointer in world space on the z = 0 plane (far away when the pointer is outside the canvas).
    const p = state.pointer;
    if (Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 && state.events.connected) {
      pointer.current.set((p.x * viewport.width) / 2, (p.y * viewport.height) / 2, 0);
    }
    for (const b of bodies) {
      // Spring toward a gently floating home position.
      target.current.copy(b.home);
      target.current.y += Math.sin(t * 0.55 + b.phase) * 0.22;
      target.current.x += Math.cos(t * 0.4 + b.phase) * 0.12;
      tmp.subVectors(target.current, b.pos).multiplyScalar(2.6);
      b.vel.addScaledVector(tmp, dt);
      // Cursor pushes shapes away.
      tmp.subVectors(b.pos, pointer.current);
      tmp.z = 0;
      const d = tmp.length();
      const reach = 2.4 + b.r;
      if (d < reach && d > 0.0001) {
        const push = Math.pow(1 - d / reach, 2) * 38;
        b.vel.addScaledVector(tmp.normalize(), push * dt);
      }
      b.vel.multiplyScalar(Math.exp(-2.6 * dt));
    }
    // Shapes bounce off each other (spheres; capsules use a slightly larger radius).
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        const ra = a.r + a.len * 0.3;
        const rb = b.r + b.len * 0.3;
        tmp.subVectors(b.pos, a.pos);
        const dist = tmp.length();
        const min = ra + rb;
        if (dist < min && dist > 0.0001) {
          const n = tmp.divideScalar(dist);
          const overlap = (min - dist) / 2;
          a.pos.addScaledVector(n, -overlap);
          b.pos.addScaledVector(n, overlap);
          const rel = n.dot(new THREE.Vector3().subVectors(b.vel, a.vel));
          if (rel < 0) {
            const impulse = -(1 + 0.55) * rel * 0.5;
            a.vel.addScaledVector(n, -impulse);
            b.vel.addScaledVector(n, impulse);
          }
        }
      }
    }
    bodies.forEach((b, i) => {
      b.pos.addScaledVector(b.vel, dt);
      b.rot.x += (b.spin.x + b.vel.y * 0.15) * dt;
      b.rot.y += (b.spin.y + b.vel.x * 0.15) * dt;
      b.rot.z += b.spin.z * dt;
      const mesh = meshes.current[i];
      if (mesh) {
        mesh.position.copy(b.pos);
        mesh.rotation.copy(b.rot);
      }
    });
    void camera;
  });

  return (
    <>
      {bodies.map((b, i) => (
        <mesh key={i} ref={(m) => void (meshes.current[i] = m)} material={materials[b.tone]}>
          {b.kind === "sphere" ? <sphereGeometry args={[b.r, 48, 48]} /> : <capsuleGeometry args={[b.r, b.len, 12, 32]} />}
        </mesh>
      ))}
    </>
  );
};

const HeroScene = ({ running, onReady }: { running: boolean; onReady?: () => void }) => {
  const accent = useMemo(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#ff4a1c", []);
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 13], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={running ? "always" : "never"}
      onCreated={({ gl }) => {
        // Neutral tone mapping keeps the accent colour true (ACES washes saturated colours out).
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1;
        onReady?.();
      }}
    >
      <Environment />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 6]} intensity={1.6} />
      <directionalLight position={[-6, -2, 4]} intensity={0.5} color="#dfe3ff" />
      <Shapes accent={accent} />
    </Canvas>
  );
};

export default HeroScene;
