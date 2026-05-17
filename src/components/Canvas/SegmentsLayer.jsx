// SegmentsLayer.jsx

import * as THREE from "three";
import { useEffect } from "react";
import { usePolygonStore } from "../Store/usePolygonStore";
import { offsetSelectedSegments } from "../../utils/offsetSelectedSegments";

export default function SegmentsLayer() {
  const {
    // SAFEZONE DATA
    safeZoneSegments,
    safeZonePoints,

    // CURVE
    convertToCurve,
    editCurve,

    // SELECTION
    selectedSegmentIds,
    toggleSelectedSegment,

    // UPDATE
    setSafeZonePoints,
  } = usePolygonStore();

  // =========================================
  // GET POINT
  // =========================================

  const getPoint = (id) => safeZonePoints.find((p) => p.id === id);

  // =========================================
  // OFFSET
  // =========================================

  const applyOffset = (distance = 0.5) => {
    const updatedPoints = offsetSelectedSegments({
      points: safeZonePoints,
      segments: safeZoneSegments,
      selectedSegmentIds,
      offset: distance,
    });

    setSafeZonePoints(updatedPoints);
  };

  // =========================================
  // KEYBOARD EVENTS
  // =========================================

  useEffect(() => {
    const handleKeyDown = (e) => {
      // OUTWARD
      if (e.key === "o") {
        applyOffset(0.5);
      }

      // INWARD
      if (e.key === "i") {
        applyOffset(-0.5);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [safeZonePoints, safeZoneSegments, selectedSegmentIds]);

  if (!safeZoneSegments.length) return null;

  return (
    <>
      {safeZoneSegments.map((seg) => {
        const p1 = getPoint(seg.start);

        const p2 = getPoint(seg.end);

        if (!p1 || !p2) return null;

        const isSelected = selectedSegmentIds.includes(seg.id);

        // =====================================
        // LINE SEGMENT
        // =====================================

        if (seg.type === "line") {
          const positions = new Float32Array([
            p1.x,
            0.05,
            p1.y,

            p2.x,
            0.05,
            p2.y,
          ]);

          // MIDPOINT
          const midX = (p1.x + p2.x) / 2;

          const midY = (p1.y + p2.y) / 2;

          // LENGTH
          const length = new THREE.Vector2(p2.x - p1.x, p2.y - p1.y).length();

          // ANGLE
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

          return (
            <group key={seg.id}>
              {/* ================================= */}
              {/* CLICKABLE HIT AREA */}
              {/* ================================= */}

              <mesh
                position={[midX, 0.05, midY]}
                rotation={[-Math.PI / 2, 0, angle]}
                onClick={(e) => {
                  e.stopPropagation();

                  toggleSelectedSegment(seg.id);

                  console.log("Selected:", seg.id);
                }}
              >
                <planeGeometry args={[length, 0.35]} />

                <meshBasicMaterial
                  transparent
                  opacity={0}
                  side={THREE.DoubleSide}
                />
              </mesh>

              {/* ================================= */}
              {/* VISIBLE LINE */}
              {/* ================================= */}

              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    array={positions}
                    count={2}
                    itemSize={3}
                  />
                </bufferGeometry>

                <lineBasicMaterial color={isSelected ? "lime" : "blue"} />
              </line>

              {/* ================================= */}
              {/* CURVE BUTTON */}
              {/* ================================= */}

              {editCurve && (
                <mesh
                  position={[midX, 0.08, midY]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  onClick={(e) => {
                    e.stopPropagation();

                    convertToCurve(seg.id);
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
            new THREE.Vector3(p1.x, 0.05, p1.y),

            new THREE.Vector3(seg.control1.x, 0.05, seg.control1.y),

            new THREE.Vector3(seg.control2.x, 0.05, seg.control2.y),

            new THREE.Vector3(p2.x, 0.05, p2.y),
          );

          const curvePoints = curve.getPoints(50);

          const positions = new Float32Array(
            curvePoints.flatMap((p) => [p.x, p.y, p.z]),
          );

          return (
            <group key={seg.id}>
              {/* CLICKABLE CURVE AREA */}

              {curvePoints.map((pt, index) => (
                <mesh
                  key={index}
                  position={[pt.x, 0.05, pt.z]}
                  onClick={(e) => {
                    e.stopPropagation();

                    toggleSelectedSegment(seg.id);
                  }}
                >
                  <circleGeometry args={[0.12, 10]} />

                  <meshBasicMaterial transparent opacity={0} />
                </mesh>
              ))}

              {/* CURVE */}

              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    array={positions}
                    count={curvePoints.length}
                    itemSize={3}
                  />
                </bufferGeometry>

                <lineBasicMaterial color={isSelected ? "lime" : "orange"} />
              </line>
            </group>
          );
        }

        return null;
      })}
    </>
  );
}
