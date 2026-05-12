import { Line } from "@react-three/drei";
import { usePolygonStore } from "../Store/usePolygonStore";
import * as THREE from "three";
import { useMemo } from "react";

export default function SafeZoneLayer() {
  const { safeZonePoints } = usePolygonStore();

  const smoothPoints = useMemo(() => {
    if (!safeZonePoints?.length) return [];

    const vectors = safeZonePoints.map(
      (p) => new THREE.Vector3(p.x, 0.05, p.y),
    );

    const curve = new THREE.CatmullRomCurve3(vectors, true, "catmullrom", 0.2);

    return curve.getPoints(500);
  }, [safeZonePoints]);

  if (!smoothPoints.length) return null;

  return <Line points={smoothPoints} color="blue" lineWidth={1} />;
}
