import { Line, Text } from "@react-three/drei";
import { usePolygonStore } from "../Store/usePolygonStore";
import * as THREE from "three";
import { useMemo } from "react";

function getClosestPointOnPolygon(point, polygonPoints) {
  let minDist = Infinity;
  let closestPoint = null;

  for (let i = 0; i < polygonPoints.length; i++) {
    const a = polygonPoints[i];
    const b = polygonPoints[(i + 1) % polygonPoints.length];

    const ax = a.x;
    const ay = a.y;

    const bx = b.x;
    const by = b.y;

    const abx = bx - ax;
    const aby = by - ay;

    // IMPORTANT:
    // point.z because polygon is on XZ plane
    const apx = point.x - ax;
    const apy = point.z - ay;

    const abLenSq = abx * abx + aby * aby;

    let t = (apx * abx + apy * aby) / abLenSq;

    t = Math.max(0, Math.min(1, t));

    const cx = ax + abx * t;
    const cy = ay + aby * t;

    // XZ DISTANCE
    const dx = point.x - cx;
    const dz = point.z - cy;

    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < minDist) {
      minDist = dist;

      // IMPORTANT:
      // cx -> x
      // cy -> z
      closestPoint = new THREE.Vector3(cx, 0.1, cy);
    }
  }

  return {
    closestPoint,
    distance: minDist,
  };
}

export default function DistanceLayer() {
  const { safeZonePoints, points, closed, measurementPointIds } =
    usePolygonStore();

  const measurements = useMemo(() => {
    if (
      !closed ||
      !safeZonePoints?.length ||
      !measurementPointIds?.length ||
      !points?.length
    ) {
      return [];
    }

    return safeZonePoints
      .filter((p) => measurementPointIds.includes(p.id))
      .map((p) => {
        // IMPORTANT:
        // Polygon exists on XZ plane
        const polygonPoint = new THREE.Vector3(p.x, 0.1, p.y);

        const { closestPoint, distance } = getClosestPointOnPolygon(
          polygonPoint,
          points,
        );

        if (!closestPoint) return null;

        const mm = Math.round(distance * 1000);

        const mid = new THREE.Vector3()
          .addVectors(polygonPoint, closestPoint)
          .multiplyScalar(0.5);

        return {
          polygonPoint,
          closestPoint,
          mm,
          mid,
        };
      })
      .filter(Boolean);
  }, [points, safeZonePoints, closed, measurementPointIds]);

  if (measurements.length === 0) return null;

  return (
    <>
      {measurements.map((m, i) => (
        <group key={i}>
          <Line
            points={[
              [m.polygonPoint.x, 0.12, m.polygonPoint.z],
              [m.closestPoint.x, 0.12, m.closestPoint.z],
            ]}
            color="red"
            lineWidth={2}
            depthTest={false}
            dashed
            dashSize={0.08}
            gapSize={0.04}
          />

          <Text
            position={[m.mid.x, 0.2, m.mid.z]}
            fontSize={0.25}
            color="red"
            depthTest={false}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="white"
            billboard
          >
            {m.mm} mm
          </Text>
        </group>
      ))}
    </>
  );
}
