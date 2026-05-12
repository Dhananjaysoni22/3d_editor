import * as THREE from "three";
import { usePolygonStore } from "../Store/usePolygonStore";

export default function SegmentsLayer() {
  const {
    segments,
    points,
    convertToCurve,
    setSelectedSegment,
    selectedPolygon,
    editCurve,
  } = usePolygonStore();

  const getPoint = (id) => points.find((p) => p.id === id);

  if (segments.length === 0) return null;

  return (
    <>
      {segments.map((seg) => {
        const p1 = getPoint(seg.start);

        const p2 = getPoint(seg.end);

        if (!p1 || !p2) return null;

        // =====================================
        // LINE SEGMENT
        // =====================================

        if (seg.type === "line") {
          const midX = (p1.x + p2.x) / 2;

          const midY = (p1.y + p2.y) / 2;

          // XZ FLOOR
          const positions = new Float32Array([
            p1.x,
            0.05,
            p1.y,

            p2.x,
            0.05,
            p2.y,
          ]);

          return (
            <group key={`${seg.id}-${p1.x}-${p1.y}-${p2.x}-${p2.y}`}>
              {/* Segment Line */}
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    array={positions}
                    count={2}
                    itemSize={3}
                  />
                </bufferGeometry>

                <lineBasicMaterial color={selectedPolygon ? "yellow" : "red"} />
              </line>

              {/* Curve Edit Button */}
              {editCurve && (
                <mesh
                  position={[midX, 0.08, midY]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  onClick={(e) => {
                    e.stopPropagation();

                    convertToCurve(seg.id);

                    setSelectedSegment(seg.id);
                  }}
                >
                  <circleGeometry args={[0.12, 16]} />

                  <meshBasicMaterial color="orange" />
                </mesh>
              )}
            </group>
          );
        }

        // =====================================
        // BEZIER CURVE
        // =====================================

        if (seg.type === "bezier") {
          const curve = new THREE.CubicBezierCurve3(
            // START
            new THREE.Vector3(p1.x, 0.05, p1.y),

            // CONTROL 1
            new THREE.Vector3(seg.control1.x, 0.05, seg.control1.y),

            // CONTROL 2
            new THREE.Vector3(seg.control2.x, 0.05, seg.control2.y),

            // END
            new THREE.Vector3(p2.x, 0.05, p2.y),
          );

          const curvePoints = curve.getPoints(50);

          const positions = new Float32Array(
            curvePoints.flatMap((p) => [p.x, p.y, p.z]),
          );

          return (
            <line
              key={JSON.stringify(seg)}
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

              <lineBasicMaterial
                color={selectedPolygon ? "yellow" : "orange"}
              />
            </line>
          );
        }

        return null;
      })}
    </>
  );
}
