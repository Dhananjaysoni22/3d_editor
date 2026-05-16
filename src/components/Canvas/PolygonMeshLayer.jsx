import * as THREE from "three";
import { usePolygonStore } from "../Store/usePolygonStore";
import { useMemo } from "react";

export default function PolygonMeshLayer() {
  const { safeZoneSegments, safeZonePoints, isMesh, model } = usePolygonStore();
  const depth = 0.05;
  const points = safeZonePoints;
  const segments = safeZoneSegments;

  const groundY = useMemo(() => {
    if (model) {
      const bbox = new THREE.Box3().setFromObject(model);
      return bbox.min.y - 0.01;
    }
    return -0.01;
  }, [model]);

  const { geometry, offsetX, offsetZ } = useMemo(() => {
    if (!isMesh || segments.length === 0)
      return { geometry: null, offsetX: 0, offsetZ: 0 };

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    let modelCenterX = 0;
    let modelCenterZ = 0;

    if (model) {
      const bbox = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      bbox.getCenter(center);
      modelCenterX = center.x;
      modelCenterZ = center.z;
    }

    const offsetX = modelCenterX - centerX;
    // ✅ FIX: negate centerY because -90° X rotation flips Y → -Z
    const offsetZ = modelCenterZ + centerY;

    const shape = new THREE.Shape();
    const getPoint = (id) => points.find((p) => p.id === id);
    let started = false;

    segments.forEach((seg) => {
      const p1 = getPoint(seg.start);
      const p2 = getPoint(seg.end);
      if (!p1 || !p2) return;

      if (!started) {
        // ✅ FIX: negate Y to un-mirror the shape
        shape.moveTo(p1.x, -p1.y);
        started = true;
      }

      if (seg.type === "line") {
        shape.lineTo(p2.x, -p2.y); // ✅ negate Y
      }

      if (seg.type === "bezier") {
        const curve = new THREE.CubicBezierCurve(
          new THREE.Vector2(p1.x, -p1.y), // ✅ negate Y
          new THREE.Vector2(seg.control1.x, -seg.control1.y), // ✅ negate Y
          new THREE.Vector2(seg.control2.x, -seg.control2.y), // ✅ negate Y
          new THREE.Vector2(p2.x, -p2.y), // ✅ negate Y
        );
        curve.getPoints(20).forEach((pt) => shape.lineTo(pt.x, pt.y));
      }
    });

    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: depth,
      bevelEnabled: false,
    });

    return { geometry, offsetX, offsetZ };
  }, [segments, points, isMesh, model]);

  if (!geometry) return null;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[offsetX, -2, offsetZ]}
      geometry={geometry}
    >
      <meshStandardMaterial color="green" side={THREE.DoubleSide} />
    </mesh>
  );
}
