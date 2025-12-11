// src/cesium.d.ts
// Fix Cesium missing TS definitions

declare module "cesium" {
  export function createWorldTerrain(options?: any): any;

  interface SampledPositionProperty {
    numberOfSamples?: number;
  }
}
