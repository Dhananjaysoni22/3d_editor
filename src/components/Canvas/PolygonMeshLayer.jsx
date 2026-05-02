import * as THREE from "three";
import { usePolygonStore } from "../Store/usePolygonStore";
import { useMemo } from "react";

export default function PolygonMeshLayer() {
  const { segments, points, isMesh } = usePolygonStore();

  const geometry = useMemo(() => {
    if (!isMesh || segments.length === 0) return null;

    const shape = new THREE.Shape();

    const getPoint = (id) => points.find((p) => p.id === id);

    let started = false;

    segments.forEach((seg) => {
      const p1 = getPoint(seg.start);
      const p2 = getPoint(seg.end);

      if (!p1 || !p2) return;

      // 🔹 START shape
      if (!started) {
        shape.moveTo(p1.x, p1.y);
        started = true;
      }

      // =========================
      // 🔹 LINE SEGMENT
      // =========================
      if (seg.type === "line") {
        shape.lineTo(p2.x, p2.y);
      }

      // =========================
      // 🔹 BEZIER SEGMENT
      // =========================
      if (seg.type === "bezier") {
        const curve = new THREE.CubicBezierCurve(
          new THREE.Vector2(p1.x, p1.y),
          new THREE.Vector2(seg.control1.x, seg.control1.y),
          new THREE.Vector2(seg.control2.x, seg.control2.y),
          new THREE.Vector2(p2.x, p2.y),
        );

        const curvePoints = curve.getPoints(20); // smoothness

        curvePoints.forEach((pt) => {
          shape.lineTo(pt.x, pt.y);
        });
      }
    });

    shape.closePath();

    // 🔥 EXTRUDE (DEPTH)
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 1,
      bevelEnabled: false,
    });

    // geometry.center();

    return geometry;
  }, [segments, points, isMesh]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="green" />
    </mesh>
  );
}
