import * as THREE from "three";
import type { PerspectiveCamera } from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { prefersReducedMotion } from "@/components/charts/engine/d3/core/animate";
import type { ThreeGeoOrbitLayout } from "@/components/charts/engine/three/threeGeoOrbit";

/** 相机入场：自更远俯角缓入默认 orbit 视角 */
export function runThreeGeoCameraIntro(
  camera: PerspectiveCamera,
  controls: OrbitControls,
  layout: ThreeGeoOrbitLayout,
  onFrame: () => void,
): () => void {
  if (prefersReducedMotion()) return () => undefined;

  const azimuth = -Math.PI / 6;
  const polar = 0.42;
  const endD = layout.defaultDistance;
  const startD = endD * 1.42;
  const startPolar = polar + 0.12;
  const { target } = layout;

  const setPose = (distance: number, polarAngle: number) => {
    camera.position.set(
      target.x + distance * Math.sin(polarAngle) * Math.sin(azimuth),
      target.y + distance * Math.cos(polarAngle),
      target.z + distance * Math.sin(polarAngle) * Math.cos(azimuth),
    );
    camera.lookAt(target);
    controls.update();
    onFrame();
  };

  setPose(startD, startPolar);

  const start = performance.now();
  const duration = 820;
  let frameId = 0;

  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3;
    setPose(startD + (endD - startD) * eased, startPolar + (polar - startPolar) * eased);
    if (t < 1) frameId = requestAnimationFrame(tick);
  };

  frameId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frameId);
}
