/* eslint-disable react/no-unknown-property */
// DrDocs hero — interactive low-poly 3D object with bloom glow.
// This module owns ALL Three.js/R3F code and is lazy-loaded by HeroCanvas so
// the heavy libraries never block first paint. No image textures are used —
// geometry + procedural (math) materials only, for instant load and low memory.
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Icosahedron, MeshDistortMaterial, OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { motion } from "framer-motion";
import * as THREE from "three";

// ───────────────────────────── TWEAK HERE ──────────────────────────────────
const CONFIG = {
  // Base colours (DrDocs brand). Change these to recolour the whole scene.
  coreColor: "#1A3C6E", // central crystal (navy)
  accentColor: "#E8500A", // orbiting shards + key light (orange)
  glowColor: "#C9A84C", // particles + rim light (gold)

  cameraDistance: 6.2, // ↑ = object looks smaller / further away
  rotationSpeed: 0.18, // idle auto-rotation (radians/sec). 0 = static
  distortSpeed: 1.4, // surface ripple speed of the core
  distortAmount: 0.32, // surface ripple intensity (0–1)
  pointerParallax: 0.25, // how much the object leans toward the pointer (desktop)
  particleCount: 220, // glow points (kept low for mobile)
  bloomIntensity: 0.9, // glow strength
};
// ────────────────────────────────────────────────────────────────────────────

const damp = THREE.MathUtils.damp;

/** Read device gyroscope (mobile) into a ref, with iOS permission handling. */
function useGyro() {
  const tilt = useRef({ beta: 0, gamma: 0 });
  useEffect(() => {
    const onOrient = (e: DeviceOrientationEvent) => {
      tilt.current.beta = e.beta ?? 0; // front-back tilt
      tilt.current.gamma = e.gamma ?? 0; // left-right tilt
    };
    const enable = () => window.addEventListener("deviceorientation", onOrient);
    // iOS 13+ needs a user-gesture-triggered permission request.
    const D = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (D && typeof D.requestPermission === "function") {
      const ask = () => D.requestPermission!().then((s) => s === "granted" && enable()).catch(() => {});
      window.addEventListener("touchend", ask, { once: true });
      return () => window.removeEventListener("touchend", ask);
    }
    enable();
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, []);
  return tilt;
}

/** A ring of small low-poly shards orbiting the core. */
function Shards() {
  const group = useRef<THREE.Group>(null!);
  const shards = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        angle: (i / 7) * Math.PI * 2,
        radius: 2.4 + (i % 3) * 0.35,
        scale: 0.18 + (i % 4) * 0.05,
        y: Math.sin(i) * 0.6,
      })),
    [],
  );
  useFrame((_, dt) => {
    group.current.rotation.y += dt * CONFIG.rotationSpeed * 1.6;
  });
  return (
    <group ref={group}>
      {shards.map((s, i) => (
        <Float key={i} speed={2} rotationIntensity={1.5} floatIntensity={1.2}>
          <mesh position={[Math.cos(s.angle) * s.radius, s.y, Math.sin(s.angle) * s.radius]} scale={s.scale}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={CONFIG.accentColor}
              emissive={CONFIG.accentColor}
              emissiveIntensity={0.6}
              roughness={0.25}
              metalness={0.4}
              flatShading
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

/** Procedural glowing particle shell (BufferGeometry, additive — no texture). */
function Particles() {
  const positions = useMemo(() => {
    const arr = new Float32Array(CONFIG.particleCount * 3);
    for (let i = 0; i < CONFIG.particleCount; i++) {
      const r = 3.2 + Math.random() * 1.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.cos(phi);
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, []);
  const pts = useRef<THREE.Points>(null!);
  useFrame((_, dt) => {
    pts.current.rotation.y -= dt * CONFIG.rotationSpeed * 0.4;
  });
  return (
    <points ref={pts}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color={CONFIG.glowColor}
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/** The animated content group: core crystal + shards + particles + parallax. */
function Experience() {
  const root = useRef<THREE.Group>(null!);
  const tilt = useGyro();
  const isTouch = useMemo(() => typeof window !== "undefined" && "ontouchstart" in window, []);

  useFrame((state, dt) => {
    const g = root.current;
    // Idle auto-rotation.
    g.rotation.y += dt * CONFIG.rotationSpeed;
    // Damped lean toward pointer (desktop) or gyroscope tilt (mobile).
    const targetX = isTouch ? THREE.MathUtils.degToRad(tilt.current.beta - 45) * 0.3 : -state.pointer.y * CONFIG.pointerParallax;
    const targetZ = isTouch ? THREE.MathUtils.degToRad(tilt.current.gamma) * 0.3 : state.pointer.x * CONFIG.pointerParallax;
    g.rotation.x = damp(g.rotation.x, targetX, 3, dt);
    g.rotation.z = damp(g.rotation.z, targetZ, 3, dt);
  });

  return (
    <group ref={root}>
      <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.8}>
        <Icosahedron args={[1.5, 1]}>
          {/* Procedural distorted surface — no texture, animates on the GPU. */}
          <MeshDistortMaterial
            color={CONFIG.coreColor}
            emissive={CONFIG.coreColor}
            emissiveIntensity={0.35}
            roughness={0.15}
            metalness={0.6}
            speed={CONFIG.distortSpeed}
            distort={CONFIG.distortAmount}
          />
        </Icosahedron>
      </Float>
      <Shards />
      <Particles />
    </group>
  );
}

/** Keeps the object framed on any screen by widening FOV on narrow viewports. */
function ResponsiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = size.width < 480 ? 58 : size.width < 900 ? 48 : 42; // tweak framing
    cam.updateProjectionMatrix();
  }, [camera, size.width]);
  return null;
}

export default function Scene3D({ active = true }: { active?: boolean }) {
  return (
    <motion.div
      style={{ position: "absolute", inset: 0 }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
    <Canvas
      // Cap pixel ratio at 2 — higher burns mobile GPU for no visible gain.
      dpr={[1, 2]}
      // Pause the render loop entirely when scrolled out of view.
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, CONFIG.cameraDistance], fov: 48, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
    >
      <ResponsiveCamera />
      {/* Lighting — brand-tinted key + rim for the glow read. */}
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={120} color={CONFIG.accentColor} />
      <pointLight position={[-5, -3, -4]} intensity={80} color={CONFIG.glowColor} />
      <Suspense fallback={null}>
        <Experience />
      </Suspense>
      {/* Bloom gives the sleek glow; threshold keeps only bright parts glowing. */}
      <EffectComposer>
        <Bloom intensity={CONFIG.bloomIntensity} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
      {/* Touch: 1-finger swipe = rotate, 2-finger pinch = zoom. Damped/inertial. */}
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        autoRotate={false}
        minDistance={4}
        maxDistance={9}
      />
    </Canvas>
    </motion.div>
  );
}
