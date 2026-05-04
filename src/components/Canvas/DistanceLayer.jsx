import { Line, Text } from "@react-three/drei";
import { usePolygonStore } from "../Store/usePolygonStore";
import * as THREE from "three";
import { useMemo } from "react";

function getClosestFromCache(worldPoint, cachedVertices) {
  let minDist = Infinity;
  let closestPoint = null;
  const fx = worldPoint.x,
    fy = worldPoint.y;

  for (let j = 0; j < cachedVertices.length; j++) {
    const [vx, vy] = cachedVertices[j];
    const dx = fx - vx,
      dy = fy - vy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      closestPoint = new THREE.Vector3(vx, vy, 0);
    }
  }
  return { closestPoint, distance: minDist };
}

export default function DistanceLayer() {
  const { points, closed, cachedVertices, measurementPointIds } =
    usePolygonStore();

  const measurements = useMemo(() => {
    if (!closed || !cachedVertices?.length || !measurementPointIds?.length)
      return [];

    return points
      .filter((p) => measurementPointIds.includes(p.id))
      .map((p) => {
        const polygonPoint = new THREE.Vector3(p.x, p.y, 0);
        const { closestPoint, distance } = getClosestFromCache(
          polygonPoint,
          cachedVertices,
        );
        if (!closestPoint) return null;

        const mm = Math.round(distance * 1000);
        const mid = new THREE.Vector3()
          .addVectors(polygonPoint, closestPoint)
          .multiplyScalar(0.5);

        return { polygonPoint, closestPoint, mm, mid };
      })
      .filter(Boolean);
  }, [points, closed, cachedVertices, measurementPointIds]);

  if (measurements.length === 0) return null;

  return (
    <>
      {measurements.map((m, i) => (
        <group key={i}>
          <Line
            points={[
              [m.polygonPoint.x, m.polygonPoint.y, 0.1],
              [m.closestPoint.x, m.closestPoint.y, 0.1],
            ]}
            color="red"
            lineWidth={2}
            depthTest={false}
          />
          <Text
            position={[m.mid.x, m.mid.y, 0.2]}
            fontSize={0.3}
            color="red"
            depthTest={false}
            anchorX="center"
            anchorY="middle"
          >
            {m.mm} mm
          </Text>
        </group>
      ))}
    </>
  );
}
