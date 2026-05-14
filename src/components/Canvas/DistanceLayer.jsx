import { Line } from "@react-three/drei";
import { usePolygonStore } from "../Store/usePolygonStore";
import * as THREE from "three";
import { useMemo } from "react";

// ======================================================
// CREATE TEXT TEXTURE
// ======================================================

function createTextTexture(text) {
  const canvas = document.createElement("canvas");

  canvas.width = 256;
  canvas.height = 128;

  const ctx = canvas.getContext("2d");

  // // BACKGROUND
  // ctx.fillStyle = "white";
  // ctx.fillRect(0, 0, canvas.width, canvas.height);

  // // BORDER
  // ctx.strokeStyle = "red";
  // ctx.lineWidth = 4;

  // ctx.strokeRect(0, 0, canvas.width, canvas.height);

  // TEXT
  ctx.fillStyle = "red";

  ctx.font = "bold 40px Arial";

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);

  texture.needsUpdate = true;

  return texture;
}

// ======================================================
// CLOSEST POINT
// ======================================================

function getClosestPointOnPolygon(point, polygonPoints) {
  let minDist = Infinity;

  let closestPoint = null;

  for (let i = 0; i < polygonPoints.length; i++) {
    const a = polygonPoints[i];

    const b = polygonPoints[(i + 1) % polygonPoints.length];

    // POLYGON POINTS
    const ax = a.x;
    const ay = a.y;

    const bx = b.x;
    const by = b.y;

    // CURRENT POINT
    const px = point.x;
    const py = point.y;

    // SEGMENT VECTOR
    const abx = bx - ax;
    const aby = by - ay;

    // POINT VECTOR
    const apx = px - ax;
    const apy = py - ay;

    const abLenSq = abx * abx + aby * aby;

    let t = (apx * abx + apy * aby) / abLenSq;

    t = Math.max(0, Math.min(1, t));

    // PROJECTED POINT
    const cx = ax + abx * t;
    const cy = ay + aby * t;

    // DISTANCE
    const dx = px - cx;
    const dy = py - cy;

    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < minDist) {
      minDist = dist;

      closestPoint = {
        x: cx,
        y: cy,
      };
    }
  }

  return {
    closestPoint,
    distance: minDist,
  };
}

// ======================================================
// COMPONENT
// ======================================================

export default function DistanceLayer() {
  const { safeZonePoints, points, closed, measurementPointIds } =
    usePolygonStore();

  const measurements = useMemo(() => {
    if (
      !closed ||
      !safeZonePoints?.length ||
      !points?.length ||
      !measurementPointIds?.length
    ) {
      return [];
    }

    return safeZonePoints
      .filter((p) => measurementPointIds.includes(p.id))
      .map((p) => {
        // 2D POLYGON POINT
        const polygonPoint = {
          x: p.x,
          y: p.y,
        };

        const { closestPoint, distance } = getClosestPointOnPolygon(
          polygonPoint,
          points,
        );

        if (!closestPoint) return null;

        // METERS -> MM
        const mm = Math.round(distance * 1000);

        console.log("Measurement:", mm);

        // 3D POINTS
        const start3D = new THREE.Vector3(polygonPoint.x, 0.15, polygonPoint.y);

        const end3D = new THREE.Vector3(closestPoint.x, 0.15, closestPoint.y);

        const mid = new THREE.Vector3()
          .addVectors(start3D, end3D)
          .multiplyScalar(0.5);

        // TEXTURE
        const texture = createTextTexture(`${mm} mm`);

        return {
          start3D,
          end3D,
          mid,
          texture,
          mm,
        };
      })
      .filter(Boolean);
  }, [safeZonePoints, points, closed, measurementPointIds]);

  if (!measurements.length) return null;

  return (
    <>
      {measurements.map((m, i) => (
        <group key={i}>
          {/* DISTANCE LINE */}
          <Line
            points={[
              [m.start3D.x, m.start3D.y, m.start3D.z],
              [m.end3D.x, m.end3D.y, m.end3D.z],
            ]}
            color="red"
            lineWidth={2}
            dashed
            dashSize={0.08}
            gapSize={0.04}
          />

          {/* MID DOT */}
          <mesh position={[m.mid.x, 0.2, m.mid.z]}>
            <sphereGeometry args={[0.05, 16, 16]} />

            <meshBasicMaterial color="red" />
          </mesh>

          {/* TEXT LABEL */}
          <sprite position={[m.mid.x, 0.35, m.mid.z]} scale={[2, 1, 1]}>
            <spriteMaterial attach="material" map={m.texture} transparent />
          </sprite>
        </group>
      ))}
    </>
  );
}
