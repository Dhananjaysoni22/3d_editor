import React, { useMemo } from "react";
import * as THREE from "three";

import { usePolygonStore } from "../Store/usePolygonStore";

export default function SafeZonePolygon() {
  const { safeZonePoints } = usePolygonStore();

  const geometry = useMemo(() => {
    if (!safeZonePoints || safeZonePoints.length < 2) {
      return null;
    }

    const points = safeZonePoints.map((p) => new THREE.Vector3(p.x, 0.2, p.y));

    // CLOSE LOOP
    points.push(
      new THREE.Vector3(safeZonePoints[0].x, 0.2, safeZonePoints[0].y),
    );

    return new THREE.BufferGeometry().setFromPoints(points);
  }, [safeZonePoints]);

  if (!geometry) return null;

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color="blue" />
    </line>
  );
}
