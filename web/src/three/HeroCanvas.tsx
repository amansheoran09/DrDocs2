// HeroCanvas — the app-facing wrapper around the 3D scene. Keeps rendering
// concerns separate from app state: it lazy-loads the heavy Three.js module,
// fades it in (Framer Motion) a beat after the UI paints, and pauses the
// render loop whenever the canvas scrolls out of view (battery / FPS saver).
import { Suspense, lazy, useEffect, useRef, useState } from "react";

// Code-split: three/R3F/postprocessing AND framer-motion all land in this
// on-demand chunk (the fade lives inside Scene3D), keeping the main bundle lean.
const Scene3D = lazy(() => import("./Scene3D"));

interface Props {
  height?: number | string; // hero height; defaults to 260px
  className?: string;
}

export function HeroCanvas({ height = 260, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [mounted, setMounted] = useState(false); // delay mount so UI paints first

  // Pause/resume on visibility (IntersectionObserver) — see Scene3D frameloop.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Lazy-load the canvas a fraction of a second after first paint.
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div ref={ref} className={className} style={{ height, width: "100%", position: "relative" }}>
      {mounted && (
        <Suspense fallback={null}>
          <Scene3D active={inView} />
        </Suspense>
      )}
    </div>
  );
}
