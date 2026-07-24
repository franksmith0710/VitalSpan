import assert from "node:assert/strict";
import { test } from "node:test";
import {
  TILE_FEATHER,
  featherWeight,
  placeTileOnCanvas,
  tileRangeForBounds,
} from "./satelliteTileStitch.mjs";

const TILE = 256;

function solidTile(r, g, b) {
  const tile = new Uint8Array(TILE * TILE * 4);
  for (let i = 0; i < tile.length; i += 4) {
    tile[i] = r;
    tile[i + 1] = g;
    tile[i + 2] = b;
    tile[i + 3] = 255;
  }
  return tile;
}

test("featherWeight ramps from 0 to 1 across TILE_FEATHER", () => {
  assert.equal(featherWeight(0), 0);
  assert.ok(featherWeight(TILE_FEATHER / 2) > 0.4);
  assert.equal(featherWeight(TILE_FEATHER), 1);
});

test("placeTileOnCanvas feathers internal vertical seam", () => {
  const canvasW = TILE * 2;
  const canvasH = TILE;
  const canvas = new Uint8Array(canvasW * canvasH * 4);
  placeTileOnCanvas(canvas, canvasW, canvasH, solidTile(255, 0, 0), 0, 0, {
    featherLeft: false,
    featherTop: false,
  });
  placeTileOnCanvas(canvas, canvasW, canvasH, solidTile(0, 0, 255), TILE, 0, {
    featherLeft: true,
    featherTop: false,
  });

  const leftIdx = (128 * canvasW + (TILE - 2)) * 4;
  const blendIdx = (128 * canvasW + (TILE + Math.floor(TILE_FEATHER / 2))) * 4;
  const rightIdx = (128 * canvasW + (TILE + TILE_FEATHER + 2)) * 4;

  assert.ok(canvas[leftIdx] > 200 && canvas[leftIdx + 2] < 50);
  assert.ok(canvas[blendIdx + 2] > 20 && canvas[blendIdx] < 240);
  assert.ok(canvas[rightIdx + 2] > 200 && canvas[rightIdx] < 50);
});

test("tileRangeForBounds counts grid tiles", () => {
  const range = tileRangeForBounds(
    { west: 10, south: 10, east: 10.5, north: 10.5 },
    5,
  );
  assert.equal(range.count, 1);
});
