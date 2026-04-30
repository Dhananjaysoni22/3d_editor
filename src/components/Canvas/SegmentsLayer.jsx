import * as THREE from "three";
import { usePolygonStore } from "../Store/usePolygonStore";
import { useMemo } from "react";

export default function SegmentsLayer() {
  const { segments, points, convertToCurve, setSelectedSegment } =
    usePolygonStore();

  const getPoint = (id) => points.find((p) => p.id === id);

  if (segments.length === 0) return null;

  return (
    <>
      {segments.map((seg) => {
        const p1 = getPoint(seg.start);
        const p2 = getPoint(seg.end);

        if (!p1 || !p2) return null;

        // =======================
        // 🔹 LINE SEGMENT
        // =======================
        if (seg.type === "line") {
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;

          const positions = new Float32Array([p1.x, p1.y, 0, p2.x, p2.y, 0]);

          return (
            <group key={`${seg.id}-${p1.x}-${p1.y}-${p2.x}-${p2.y}`}>
              {/* line */}
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    array={positions}
                    count={2}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="white" />
              </line>

              {/* midpoint button */}
              <mesh
                position={[midX, midY, 0]}
                onClick={(e) => {
                  e.stopPropagation();
                  convertToCurve(seg.id);
                  setSelectedSegment(seg.id);
                }}
              >
                <circleGeometry args={[0.25, 16]} />
                <meshBasicMaterial color="orange" />
              </mesh>
            </group>
          );
        }

        // =======================
        // 🔹 BEZIER CURVE
        // =======================
        if (seg.type === "bezier") {
          // 🔥 generate curve
          const curve = new THREE.CubicBezierCurve3(
            new THREE.Vector3(p1.x, p1.y, 0),
            new THREE.Vector3(seg.control1.x, seg.control1.y, 0),
            new THREE.Vector3(seg.control2.x, seg.control2.y, 0),
            new THREE.Vector3(p2.x, p2.y, 0),
          );

          const curvePoints = curve.getPoints(50);

          const positions = new Float32Array(
            curvePoints.flatMap((p) => [p.x, p.y, p.z]),
          );

          return (
            <line
              key={JSON.stringify(seg)} // 🔥 FORCE UPDATE
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSegment(seg.id);
              }}
            >
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  array={positions}
                  count={curvePoints.length}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="orange" />
            </line>
          );
        }

        return null;
      })}
    </>
  );
}
