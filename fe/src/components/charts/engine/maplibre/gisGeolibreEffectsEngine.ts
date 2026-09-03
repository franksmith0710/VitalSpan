import type { SkySpecification } from "maplibre-gl";
import type { ResolvedGisEffectsSettings } from "@/components/charts/engine/maplibre/gisGeolibreEffectsSettings";
import {
  GIS_SPACE_EDGE_DARKEN,
  nextGisEffectsFrameTime,
  parseEffectsHex,
  rgbaEffects,
  shadeEffectsRgb,
} from "@/components/charts/engine/maplibre/gisGeolibreEffectsSettings";
import {
  drawGeolibreComets,
  type GeolibreComet,
} from "@/components/charts/engine/maplibre/gisGeolibreEffectsComets";
import {
  buildGeolibreStarfieldTile,
  drawGeolibreStarfieldParallax,
} from "@/components/charts/engine/maplibre/gisGeolibreEffectsStarfield";
import {
  bindMapRenderSync,
  resolveGlobeLimbBoundsForOverlay,
  resolveGlobeScreenBounds,
  shouldRenderGisGlobeFarEffects,
} from "@/components/charts/engine/maplibre/gisGlobeLayout";
import { drawGlobeAtmosphereHalo } from "@/components/charts/engine/maplibre/gisGlobeHaloDraw";

type MapLibreMap = import("maplibre-gl").Map;

const EFFECTS_MAP_CLASS = "vs-gis-geolibre-effects-map";
const EFFECTS_STYLE_ID = "vs-gis-geolibre-effects-overlays";
const MAP_CANVAS_Z = "4";
/** 光晕叠在 map canvas 之上，仅外环可见（见 gisGlobeHaloDraw evenodd）。 */
const HALO_CANVAS_Z = "5";
const CONTROL_Z = "6";

function isGlobeProjection(map: MapLibreMap): boolean {
  try {
    return map.getProjection()?.type === "globe";
  } catch {
    return false;
  }
}

function createLayerCanvas(zIndex: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.dataset.testid =
    zIndex === 0
      ? "gis-effects-space"
      : zIndex === 1
        ? "gis-effects-stars"
        : zIndex === 2
          ? "gis-effects-comets"
          : "gis-effects-halo";
  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = String(zIndex);
  return canvas;
}

export class GisGeolibreEffectsEngine {
  private readonly map: MapLibreMap;
  private settings: ResolvedGisEffectsSettings;
  private readonly mapCanvas: HTMLCanvasElement;
  private readonly mapRoot: HTMLElement | null;
  private readonly controlContainer: HTMLElement | null;
  private readonly previousMapZ: string;
  private readonly previousControlZ: string;
  private readonly previousSky: SkySpecification | undefined;
  private readonly overlayStyle: HTMLStyleElement;
  private readonly spaceCtx: CanvasRenderingContext2D;
  private readonly starsCtx: CanvasRenderingContext2D;
  private readonly cometCtx: CanvasRenderingContext2D;
  private readonly haloCtx: CanvasRenderingContext2D;
  private starfield: HTMLCanvasElement | null = null;
  private starfieldOriginLng = 0;
  private starfieldOriginLat = 0;
  private comets: GeolibreComet[] = [];
  private spaceGradient: CanvasGradient | null = null;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private starsDirty = true;
  private rafId: number | null = null;
  private lastFrameTime = -Infinity;
  private destroyed = false;
  private unbindMapRender: (() => void) | undefined;

  constructor(map: MapLibreMap, settings: ResolvedGisEffectsSettings) {
    this.map = map;
    this.settings = settings;
    this.mapCanvas = map.getCanvas();
    this.mapRoot = this.mapCanvas.closest(".maplibregl-map");
    this.controlContainer =
      this.mapRoot?.querySelector<HTMLElement>(".maplibregl-control-container") ?? null;
    this.previousMapZ = this.mapCanvas.style.zIndex;
    this.previousControlZ = this.controlContainer?.style.zIndex ?? "";
    this.previousSky = this.readSky();
    this.suppressMapLibreAtmosphere();
    this.overlayStyle = this.ensureOverlayStyle();

    const space = createLayerCanvas(0);
    const stars = createLayerCanvas(1);
    const comets = createLayerCanvas(2);
    const halo = createLayerCanvas(3);
    halo.style.zIndex = HALO_CANVAS_Z;
    const container = map.getCanvasContainer();
    container.append(space, stars, comets, halo);
    this.spaceCtx = space.getContext("2d")!;
    this.starsCtx = stars.getContext("2d")!;
    this.cometCtx = comets.getContext("2d")!;
    this.haloCtx = halo.getContext("2d")!;

    this.mapRoot?.classList.add(EFFECTS_MAP_CLASS);
    this.mapCanvas.style.zIndex = MAP_CANVAS_Z;
    if (this.controlContainer) this.controlContainer.style.zIndex = CONTROL_Z;
    container.style.background = "transparent";
    this.mapCanvas.style.background = "transparent";

    this.handleResize = this.handleResize.bind(this);
    this.handleMapChange = this.handleMapChange.bind(this);
    this.handleVisibility = this.handleVisibility.bind(this);
    this.handleStyleData = this.handleStyleData.bind(this);
    this.tick = this.tick.bind(this);
    this.unbindMapRender = bindMapRenderSync(map, () => {
      if (!document.hidden) this.start();
    });
    map.on("resize", this.handleResize);
    map.on("move", this.handleMapChange);
    map.on("styledata", this.handleStyleData);
    map.once("load", this.handleResize);
    document.addEventListener("visibilitychange", this.handleVisibility);
    this.handleResize();
    this.start();
  }

  applySettings(settings: ResolvedGisEffectsSettings): void {
    this.settings = settings;
    this.spaceGradient = null;
    if (!document.hidden) this.start();
  }

  destroy(): void {
    this.destroyed = true;
    this.stop();
    this.map.off("resize", this.handleResize);
    this.map.off("move", this.handleMapChange);
    this.map.off("styledata", this.handleStyleData);
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.unbindMapRender?.();
    this.unbindMapRender = undefined;
    this.mapCanvas.style.zIndex = this.previousMapZ;
    if (this.controlContainer) this.controlContainer.style.zIndex = this.previousControlZ;
    try {
      if (this.previousSky) this.map.setSky(this.previousSky);
    } catch {
      /* style tearing down */
    }
    this.mapRoot?.classList.remove(EFFECTS_MAP_CLASS);
    this.overlayStyle.remove();
    for (const ctx of [this.spaceCtx, this.starsCtx, this.cometCtx, this.haloCtx]) {
      ctx.canvas.remove();
    }
  }

  private ensureOverlayStyle(): HTMLStyleElement {
    const existing = document.getElementById(EFFECTS_STYLE_ID);
    if (existing instanceof HTMLStyleElement) return existing;
    const style = document.createElement("style");
    style.id = EFFECTS_STYLE_ID;
    style.textContent = `
      .${EFFECTS_MAP_CLASS} .maplibregl-control-container { z-index: ${CONTROL_Z}; pointer-events: auto; }
      .${EFFECTS_MAP_CLASS} .maplibregl-ctrl-top-right,
      .${EFFECTS_MAP_CLASS} .maplibregl-ctrl-bottom-left,
      .${EFFECTS_MAP_CLASS} .maplibregl-ctrl-bottom-right { pointer-events: auto; }
      .${EFFECTS_MAP_CLASS} .maplibregl-boxzoom { z-index: 6; }
      .${EFFECTS_MAP_CLASS} .maplibregl-marker { z-index: ${CONTROL_Z}; }
    `;
    document.head.appendChild(style);
    return style;
  }

  private readSky(): SkySpecification | undefined {
    try {
      return this.map.getSky();
    } catch {
      return undefined;
    }
  }

  private suppressMapLibreAtmosphere(): void {
    try {
      const sky = this.map.getSky();
      if (sky && sky["atmosphere-blend"] !== 0) {
        this.map.setSky({ ...sky, "atmosphere-blend": 0 });
      }
    } catch {
      /* style without sky */
    }
  }

  private handleVisibility(): void {
    if (document.hidden) this.stop();
    else this.start();
  }

  private handleMapChange(): void {
    this.starsDirty = true;
    if (!document.hidden) this.start();
  }

  private handleStyleData(): void {
    if (this.destroyed) return;
    this.suppressMapLibreAtmosphere();
  }

  private handleResize(): void {
    const mapCanvas = this.map.getCanvas();
    this.width = mapCanvas.clientWidth;
    this.height = mapCanvas.clientHeight;
    this.dpr = window.devicePixelRatio || 1;
    for (const ctx of [this.spaceCtx, this.starsCtx, this.cometCtx, this.haloCtx]) {
      const canvas = ctx.canvas;
      canvas.style.width = `${this.width}px`;
      canvas.style.height = `${this.height}px`;
      canvas.width = Math.round(this.width * this.dpr);
      canvas.height = Math.round(this.height * this.dpr);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    this.starfield = null;
    this.spaceGradient = null;
    this.starsDirty = true;
  }

  private start(): void {
    if (this.destroyed || this.rafId !== null) return;
    this.rafId = requestAnimationFrame(this.tick);
  }

  private stop(): void {
    if (this.rafId === null) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private drawSpaceBackground(): void {
    const ctx = this.spaceCtx;
    if (!this.spaceGradient) {
      const gradient = ctx.createRadialGradient(
        this.width / 2,
        this.height / 2,
        0,
        this.width / 2,
        this.height / 2,
        Math.max(this.width, this.height) * 0.75,
      );
      const space = parseEffectsHex(this.settings.spaceColor, { r: 12, g: 27, b: 51 });
      gradient.addColorStop(0, rgbaEffects(space, 1));
      gradient.addColorStop(1, rgbaEffects(shadeEffectsRgb(space, -GIS_SPACE_EDGE_DARKEN), 1));
      this.spaceGradient = gradient;
    }
    ctx.fillStyle = this.spaceGradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private ensureStarfield(): void {
    if (this.starfield) return;
    const center = this.map.getCenter();
    this.starfieldOriginLng = center.lng;
    this.starfieldOriginLat = center.lat;
    this.starfield = buildGeolibreStarfieldTile(this.width, this.height, this.dpr);
  }

  private drawStarfield(): void {
    if (this.width <= 0 || this.height <= 0 || !this.starfield) return;
    const center = this.map.getCenter();
    drawGeolibreStarfieldParallax(
      this.starsCtx,
      this.width,
      this.height,
      this.starfield,
      center.lng,
      center.lat,
      this.starfieldOriginLng,
      this.starfieldOriginLat,
    );
  }

  private isFarGlobeView(): boolean {
    if (this.width <= 0 || this.height <= 0) return false;
    return shouldRenderGisGlobeFarEffects(
      this.map,
      resolveGlobeScreenBounds(this.map),
      this.width,
      this.height,
    );
  }

  private drawHaloLayer(): void {
    if (this.width <= 0 || this.height <= 0 || !this.settings.enabled) return;
    const overlay = this.map.getCanvasContainer();
    const limb = resolveGlobeLimbBoundsForOverlay(this.map, overlay, this.width, this.height);
    if (!limb) {
      this.haloCtx.clearRect(0, 0, this.width, this.height);
      return;
    }
    drawGlobeAtmosphereHalo(this.haloCtx, this.width, this.height, limb, this.settings);
  }

  private tick(timestamp: number): void {
    this.rafId = null;
    if (this.destroyed) return;

    const nextFrameTime = nextGisEffectsFrameTime(timestamp, this.lastFrameTime);
    if (nextFrameTime === null) {
      this.start();
      return;
    }
    const elapsed = Number.isFinite(this.lastFrameTime)
      ? Math.min(nextFrameTime - this.lastFrameTime, (1000 / 60) * 2)
      : 1000 / 60;
    this.lastFrameTime = nextFrameTime;

    this.spaceCtx.clearRect(0, 0, this.width, this.height);
    this.cometCtx.clearRect(0, 0, this.width, this.height);
    this.haloCtx.clearRect(0, 0, this.width, this.height);

    if (!isGlobeProjection(this.map)) {
      this.starsCtx.clearRect(0, 0, this.width, this.height);
      return;
    }

    this.drawSpaceBackground();
    // 光晕跟球缘走，任意 zoom 都应绘制；星场/流星才在远视图隐藏。
    this.drawHaloLayer();

    if (!this.isFarGlobeView()) {
      this.starsCtx.clearRect(0, 0, this.width, this.height);
      this.comets = [];
      this.start();
      return;
    }
    if (this.starsDirty) {
      this.ensureStarfield();
      this.drawStarfield();
      this.starsDirty = false;
    }
    this.comets = drawGeolibreComets(
      this.cometCtx,
      this.width,
      this.height,
      this.comets,
      elapsed / (1000 / 60),
    );
    this.start();
  }
}
