// © mitsulab. three をそのまま渡し、WebGLRenderer だけシェーダーの検査（同期で待つ getProgramInfoLog）を切る。HP のこま落ちを減らすため（2026-11-05）。
import { WebGLRenderer as Base } from '../vendor/three/build/three.module.js';
export * from '../vendor/three/build/three.module.js';
export class WebGLRenderer extends Base { constructor(o) { super(o); this.debug.checkShaderErrors = false; } }
