import { RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AmbientLight,
  BoxGeometry,
  CircleGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  WebGLRenderer,
} from 'three';
import type { Spatial3DSpec } from '../../types/lesson';

interface Spatial3DSceneProps {
  spec: Spatial3DSpec;
}

function numParam(
  params: Record<string, number | string>,
  key: string,
  fallback: number,
): number {
  const raw = params[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function strParam(
  params: Record<string, number | string>,
  key: string,
  fallback: string,
): string {
  const raw = params[key];
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : fallback;
}

const DEFAULT_YAW = 0.58;
const DEFAULT_PITCH = 0.45;

export function Spatial3DScene({ spec }: Spatial3DSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  const lengthVal = Math.max(
    1,
    Math.min(8, Math.round(numParam(spec.params, 'length', 4))),
  );
  const widthVal = Math.max(
    1,
    Math.min(8, Math.round(numParam(spec.params, 'width', 3))),
  );
  const heightVal = Math.max(
    1,
    Math.min(8, Math.round(numParam(spec.params, 'height', 3))),
  );
  const radiusVal = Math.max(
    1,
    Math.min(10, Math.round(numParam(spec.params, 'radius', 3))),
  );
  const unitLabel = strParam(spec.params, 'unit', 'cm');

  const [visibleLayers, setVisibleLayers] = useState<number>(heightVal);
  const [unfoldPercent, setUnfoldPercent] = useState<number>(0);

  useEffect(() => {
    setVisibleLayers(heightVal);
    setUnfoldPercent(0);
  }, [spec, heightVal]);

  const controls = useMemo(
    () => new Set(spec.allowedControls ?? ['ORBIT_RESET']),
    [spec.allowedControls],
  );

  const renderRef = useRef<(() => void) | null>(null);
  const updateDynamicRef = useRef<
    ((opts: { layers: number; unfold: number }) => void) | null
  >(null);
  const resetCameraRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    setWebglUnavailable(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = false;

    const initialW = Math.max(260, container.clientWidth || 480);
    const initialH = 290;
    renderer.setSize(initialW, initialH);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = `${initialH}px`;
    renderer.domElement.style.touchAction = 'none';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new Scene();
    scene.background = new Color('#f8fafc');

    const camera = new PerspectiveCamera(40, initialW / initialH, 0.1, 100);
    const ambient = new AmbientLight(0xffffff, 0.82);
    const dirLight = new DirectionalLight(0xffffff, 0.55);
    dirLight.position.set(5, 8, 6);
    scene.add(ambient, dirLight);

    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(item: T): T => {
      disposables.push(item);
      return item;
    };

    let defaultRadius = 6.2;
    if (spec.modelType === 'NET_UNFOLD') defaultRadius = 7.4;
    if (spec.modelType === 'CYLINDER_UNFOLD') defaultRadius = 8.4;

    let yaw = DEFAULT_YAW;
    let pitch = DEFAULT_PITCH;
    let radius = defaultRadius;

    const updateCamera = () => {
      const cosPitch = Math.cos(pitch);
      camera.position.set(
        radius * cosPitch * Math.sin(yaw),
        radius * Math.sin(pitch),
        radius * cosPitch * Math.cos(yaw),
      );
      camera.lookAt(0, 0, 0);
    };

    const renderNow = () => {
      updateCamera();
      renderer.render(scene, camera);
    };
    renderRef.current = renderNow;

    resetCameraRef.current = () => {
      yaw = DEFAULT_YAW;
      pitch = DEFAULT_PITCH;
      radius = defaultRadius;
      renderNow();
    };

    const edgeLineMat = track(
      new LineBasicMaterial({ color: 0x0f172a }),
    );

    const addFaceWithEdges = (
      parent: Object3D,
      w: number,
      h: number,
      colorHex: number,
      rx: number,
      ry: number,
      pos: [number, number, number],
    ) => {
      const geo = track(new PlaneGeometry(w, h));
      const mat = track(
        new MeshLambertMaterial({
          color: colorHex,
          side: DoubleSide,
        }),
      );
      const mesh = new Mesh(geo, mat);
      mesh.rotation.set(rx, ry, 0);
      mesh.position.set(pos[0], pos[1], pos[2]);

      const edges = track(new EdgesGeometry(geo));
      const line = new LineSegments(edges, edgeLineMat);
      mesh.add(line);
      parent.add(mesh);
      return mesh;
    };

    if (spec.modelType === 'CUBOID_BLOCKS') {
      const unitSize = Math.min(
        0.72,
        3.2 / Math.max(lengthVal, widthVal, heightVal),
      );
      const geo = track(
        new BoxGeometry(unitSize * 0.94, unitSize * 0.94, unitSize * 0.94),
      );
      const mat = track(new MeshLambertMaterial({ color: 0xffffff }));
      const total = lengthVal * widthVal * heightVal;
      const instanced = new InstancedMesh(geo, mat, total);

      const dummy = new Object3D();
      const layerColors = [
        new Color('#38bdf8'),
        new Color('#60a5fa'),
        new Color('#34d399'),
        new Color('#fbbf24'),
        new Color('#a78bfa'),
        new Color('#fb7185'),
      ];

      let idx = 0;
      const offsetX = ((lengthVal - 1) * unitSize) / 2;
      const offsetY = ((heightVal - 1) * unitSize) / 2;
      const offsetZ = ((widthVal - 1) * unitSize) / 2;

      for (let y = 0; y < heightVal; y++) {
        const c = layerColors[y % layerColors.length];
        for (let z = 0; z < widthVal; z++) {
          for (let x = 0; x < lengthVal; x++) {
            dummy.position.set(
              x * unitSize - offsetX,
              y * unitSize - offsetY,
              z * unitSize - offsetZ,
            );
            dummy.updateMatrix();
            instanced.setMatrixAt(idx, dummy.matrix);
            instanced.setColorAt(idx, c);
            idx++;
          }
        }
      }
      instanced.instanceMatrix.needsUpdate = true;
      if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
      scene.add(instanced);

      updateDynamicRef.current = ({ layers }) => {
        const clamped = Math.max(1, Math.min(heightVal, layers));
        instanced.count = lengthVal * widthVal * clamped;
        renderNow();
      };
    } else if (spec.modelType === 'NET_UNFOLD') {
      const scale = 2.4 / Math.max(lengthVal, widthVal, heightVal);
      const sx = lengthVal * scale;
      const sz = widthVal * scale;
      const sy = heightVal * scale;

      const root = new Group();
      root.position.y = -sy * 0.3;
      scene.add(root);

      // 底面
      addFaceWithEdges(root, sx, sz, 0xbae6fd, -Math.PI / 2, 0, [0, 0, 0]);

      // 前面樞紐 (+Z)
      const frontPivot = new Group();
      frontPivot.position.set(0, 0, sz / 2);
      root.add(frontPivot);
      addFaceWithEdges(frontPivot, sx, sy, 0xfde68a, -Math.PI / 2, 0, [
        0,
        0,
        sy / 2,
      ]);

      // 後面樞紐 (-Z) + 頂面樞紐
      const backPivot = new Group();
      backPivot.position.set(0, 0, -sz / 2);
      root.add(backPivot);
      addFaceWithEdges(backPivot, sx, sy, 0xfde68a, -Math.PI / 2, 0, [
        0,
        0,
        -sy / 2,
      ]);

      const topPivot = new Group();
      topPivot.position.set(0, 0, -sy);
      backPivot.add(topPivot);
      addFaceWithEdges(topPivot, sx, sz, 0xbae6fd, -Math.PI / 2, 0, [
        0,
        0,
        -sz / 2,
      ]);

      // 左面樞紐 (-X)
      const leftPivot = new Group();
      leftPivot.position.set(-sx / 2, 0, 0);
      root.add(leftPivot);
      addFaceWithEdges(leftPivot, sy, sz, 0xbbf7d0, -Math.PI / 2, 0, [
        -sy / 2,
        0,
        0,
      ]);

      // 右面樞紐 (+X)
      const rightPivot = new Group();
      rightPivot.position.set(sx / 2, 0, 0);
      root.add(rightPivot);
      addFaceWithEdges(rightPivot, sy, sz, 0xbbf7d0, -Math.PI / 2, 0, [
        sy / 2,
        0,
        0,
      ]);

      const applyUnfold = (unfoldPct: number) => {
        const t = Math.max(0, Math.min(1, unfoldPct / 100));
        const fold = 1 - t;
        frontPivot.rotation.x = (-Math.PI / 2) * fold;
        backPivot.rotation.x = (Math.PI / 2) * fold;
        topPivot.rotation.x = (Math.PI / 2) * fold;
        leftPivot.rotation.z = (-Math.PI / 2) * fold;
        rightPivot.rotation.z = (Math.PI / 2) * fold;
      };

      applyUnfold(0);
      updateDynamicRef.current = ({ unfold }) => {
        applyUnfold(unfold);
        renderNow();
      };
    } else if (spec.modelType === 'CYLINDER_UNFOLD') {
      const r = 0.72;
      const h = Math.max(1.0, Math.min(2.0, (heightVal / Math.max(1, radiusVal)) * 0.72));
      const segments = 24;
      const halfSegs = segments / 2;
      const theta = (Math.PI * 2) / segments;
      const stripW = 2 * r * Math.tan(Math.PI / segments);

      const root = new Group();
      scene.add(root);

      const stripMat = track(
        new MeshLambertMaterial({
          color: 0xfde68a,
          side: DoubleSide,
        }),
      );
      const stripGeo = track(new PlaneGeometry(stripW, h));

      // 中央基準側面長條位於 z = +r
      const centerMesh = new Mesh(stripGeo, stripMat);
      centerMesh.position.set(0, 0, r);
      root.add(centerMesh);

      // 展開後顯示完整側面外框邊線
      const centerEdges = track(new EdgesGeometry(stripGeo));
      const topBottomCapMat = track(
        new MeshLambertMaterial({
          color: 0xbae6fd,
          side: DoubleSide,
        }),
      );
      const discGeo = track(new CircleGeometry(r, 36));
      const discEdges = track(new EdgesGeometry(discGeo));

      // 上圓底面樞紐
      const topDiscPivot = new Group();
      topDiscPivot.position.set(0, h / 2, r);
      root.add(topDiscPivot);
      const topDisc = new Mesh(discGeo, topBottomCapMat);
      topDisc.rotation.x = -Math.PI / 2;
      topDisc.position.set(0, 0, -r);
      topDisc.add(new LineSegments(discEdges, edgeLineMat));
      topDiscPivot.add(topDisc);

      // 下圓底面樞紐
      const bottomDiscPivot = new Group();
      bottomDiscPivot.position.set(0, -h / 2, r);
      root.add(bottomDiscPivot);
      const bottomDisc = new Mesh(discGeo, topBottomCapMat);
      bottomDisc.rotation.x = -Math.PI / 2;
      bottomDisc.position.set(0, 0, -r);
      bottomDisc.add(new LineSegments(discEdges, edgeLineMat));
      bottomDiscPivot.add(bottomDisc);

      const rightPivots: Group[] = [];
      let parentRight: Object3D = centerMesh;
      for (let i = 0; i < halfSegs; i++) {
        const pivot = new Group();
        pivot.position.set(i === 0 ? stripW / 2 : stripW, 0, 0);
        parentRight.add(pivot);
        const segMesh = new Mesh(stripGeo, stripMat);
        segMesh.position.set(stripW / 2, 0, 0);
        if (i === halfSegs - 1) {
          segMesh.add(new LineSegments(centerEdges, edgeLineMat));
        }
        pivot.add(segMesh);
        rightPivots.push(pivot);
        parentRight = pivot;
      }

      const leftPivots: Group[] = [];
      let parentLeft: Object3D = centerMesh;
      for (let i = 0; i < halfSegs; i++) {
        const pivot = new Group();
        pivot.position.set(i === 0 ? -stripW / 2 : -stripW, 0, 0);
        parentLeft.add(pivot);
        const segMesh = new Mesh(stripGeo, stripMat);
        segMesh.position.set(-stripW / 2, 0, 0);
        if (i === halfSegs - 1) {
          segMesh.add(new LineSegments(centerEdges, edgeLineMat));
        }
        pivot.add(segMesh);
        leftPivots.push(pivot);
        parentLeft = pivot;
      }

      const applyCylinderUnfold = (unfoldPct: number) => {
        const t = Math.max(0, Math.min(1, unfoldPct / 100));
        const fold = 1 - t;
        for (const p of rightPivots) {
          p.rotation.y = theta * fold;
        }
        for (const p of leftPivots) {
          p.rotation.y = -theta * fold;
        }
        topDiscPivot.rotation.x = (Math.PI / 2) * t;
        bottomDiscPivot.rotation.x = (-Math.PI / 2) * t;
      };

      applyCylinderUnfold(0);
      updateDynamicRef.current = ({ unfold }) => {
        applyCylinderUnfold(unfold);
        renderNow();
      };
    } else {
      // EARTH_MOON_SUN
      const sunGeo = track(new SphereGeometry(0.65, 24, 24));
      const sunMat = track(new MeshBasicMaterial({ color: 0xf59e0b }));
      scene.add(new Mesh(sunGeo, sunMat));

      const earthGeo = track(new SphereGeometry(0.28, 20, 20));
      const earthMat = track(new MeshLambertMaterial({ color: 0x0ea5e9 }));
      const earth = new Mesh(earthGeo, earthMat);
      earth.position.set(2.2, 0, 0);
      scene.add(earth);

      const moonGeo = track(new SphereGeometry(0.12, 16, 16));
      const moonMat = track(new MeshLambertMaterial({ color: 0x94a3b8 }));
      const moon = new Mesh(moonGeo, moonMat);
      moon.position.set(2.75, 0, 0.25);
      scene.add(moon);

      updateDynamicRef.current = null;
    }

    renderNow();

    // 指標拖曳旋轉視角（僅拖曳時重繪）
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const dom = renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      dom.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      yaw -= dx * 0.01;
      pitch = Math.max(-0.15, Math.min(Math.PI / 2 - 0.1, pitch + dy * 0.01));
      renderNow();
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (dom.hasPointerCapture(e.pointerId)) {
        dom.releasePointerCapture(e.pointerId);
      }
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', onPointerUp);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextW = Math.max(260, Math.round(entry.contentRect.width));
      camera.aspect = nextW / initialH;
      camera.updateProjectionMatrix();
      renderer.setSize(nextW, initialH);
      renderNow();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointercancel', onPointerUp);
      renderRef.current = null;
      updateDynamicRef.current = null;
      resetCameraRef.current = null;
      for (const item of disposables) {
        item.dispose();
      }
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [heightVal, lengthVal, radiusVal, spec, widthVal]);

  const handleLayerChange = useCallback((nextLayers: number) => {
    setVisibleLayers(nextLayers);
    updateDynamicRef.current?.({ layers: nextLayers, unfold: unfoldPercent });
  }, [unfoldPercent]);

  const handleUnfoldChange = useCallback((nextUnfold: number) => {
    setUnfoldPercent(nextUnfold);
    updateDynamicRef.current?.({ layers: visibleLayers, unfold: nextUnfold });
  }, [visibleLayers]);

  const summaryBanner = useMemo(() => {
    if (spec.modelType === 'CUBOID_BLOCKS') {
      const perLayer = lengthVal * widthVal;
      return `長 ${lengthVal} ${unitLabel} × 寬 ${widthVal} ${unitLabel}（每層 ${perLayer} 塊）｜目前顯示 ${visibleLayers} / ${heightVal} 層 = ${perLayer * visibleLayers} ${unitLabel}³`;
    }
    if (spec.modelType === 'NET_UNFOLD') {
      const area =
        2 * (lengthVal * widthVal + widthVal * heightVal + lengthVal * heightVal);
      return `長 ${lengthVal} · 寬 ${widthVal} · 高 ${heightVal} ${unitLabel}｜3 組全等長方形，表面積 = ${area} ${unitLabel}²`;
    }
    if (spec.modelType === 'CYLINDER_UNFOLD') {
      return `圓柱底面半徑 ${radiusVal} ${unitLabel} · 柱高 ${heightVal} ${unitLabel}｜側面展開為「底圓周長 × 高」的長方形`;
    }
    return '日、地、月立體軌道相對位置模型';
  }, [
    heightVal,
    lengthVal,
    radiusVal,
    spec.modelType,
    unitLabel,
    visibleLayers,
    widthVal,
  ]);

  if (webglUnavailable) {
    return (
      <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-5 text-center text-sm font-bold text-slate-600">
        目前裝置不支援 WebGL 3D 渲染；重點整理：{summaryBanner}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border-2 border-slate-200 bg-white p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-800">
        <span>{summaryBanner}</span>
        <span className="text-[11px] font-bold text-slate-500">
          可拖曳旋轉視角
        </span>
      </div>

      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50/70 px-3.5 py-2.5">
        {controls.has('LAYER_SLICE') && spec.modelType === 'CUBOID_BLOCKS' && (
          <label className="flex flex-1 items-center gap-3 text-xs font-black text-sky-900">
            <span className="shrink-0">逐層顯示積木：</span>
            <input
              type="range"
              min={1}
              max={heightVal}
              step={1}
              value={visibleLayers}
              onChange={(e) => handleLayerChange(Number(e.target.value))}
              className="h-2 flex-1 cursor-pointer accent-sky-600"
            />
            <span className="w-14 shrink-0 text-right">
              {visibleLayers} / {heightVal} 層
            </span>
          </label>
        )}

        {controls.has('UNFOLD_SLIDER') &&
          (spec.modelType === 'NET_UNFOLD' ||
            spec.modelType === 'CYLINDER_UNFOLD') && (
            <label className="flex flex-1 items-center gap-3 text-xs font-black text-sky-900">
              <span className="shrink-0">展開／摺疊圖形：</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={unfoldPercent}
                onChange={(e) => handleUnfoldChange(Number(e.target.value))}
                className="h-2 flex-1 cursor-pointer accent-sky-600"
              />
              <span className="w-12 shrink-0 text-right">{unfoldPercent}%</span>
            </label>
          )}

        {controls.has('ORBIT_RESET') && (
          <button
            type="button"
            onClick={() => resetCameraRef.current?.()}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-sky-300 bg-white px-3 py-1.5 text-xs font-black text-sky-800 hover:bg-sky-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>重設標準視角</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default Spatial3DScene;
