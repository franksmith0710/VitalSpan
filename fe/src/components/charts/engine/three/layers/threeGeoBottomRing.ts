import * as THREE from "three";

function ringTexture(isDark: boolean): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = size / 2;
  const cy = size / 2;
  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 6; i += 1) {
    const r = size * 0.12 + i * (size * 0.07);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = isDark
      ? `rgba(143, 194, 255, ${0.35 - i * 0.04})`
      : `rgba(96, 165, 250, ${0.28 - i * 0.03})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 对标 sc-datav Bottom：底部旋转光环 */
export function mountThreeGeoBottomRing(
  scene: THREE.Scene,
  span: number,
  isDark: boolean,
): { update: (delta: number) => void; dispose: () => void } {
  const tex = ringTexture(isDark);
  const ring = new THREE.Mesh(
    new THREE.PlaneGeometry(span * 0.55, span * 0.55),
    new THREE.MeshBasicMaterial({
      map: tex,
      color: isDark ? 0x8fc2ff : 0x60a5fa,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.01;
  scene.add(ring);

  return {
    update: (delta: number) => {
      ring.rotation.z += delta / 5;
    },
    dispose: () => {
      tex.dispose();
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
      scene.remove(ring);
    },
  };
}
