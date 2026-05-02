import { Line, Text } from "@react-three/drei";
import { usePolygonStore } from "../Store/usePolygonStore";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

export default function DistanceLayer() {
  const { points, closed, model } = usePolygonStore();
  const { camera, size } = useThree();
  model?.traverse((child) => {
    if (child.isMesh) {
      console.log("✅ Mesh found:", child);
    }
  });
  if (!closed || !model || points.length === 0) return null;

  const samplePoints = [
    points[0],
    points[Math.floor(points.length / 2)],
    points[points.length - 1],
  ].filter(Boolean);

  return (
    <>
      {samplePoints.map((p, i) => {
        const raycaster = new THREE.Raycaster();

        // ✅ convert world → screen
        const vector = new THREE.Vector3(p.x, p.y, 0).project(camera);

        const mouse = {
          x: vector.x,
          y: vector.y,
        };

        raycaster.setFromCamera(mouse, camera);

        let hits = [];

        model.updateWorldMatrix(true, true);

        model.traverse((child) => {
          if (child.isMesh) {
            const result = raycaster.intersectObject(child, false);
            if (result.length > 0) hits.push(...result);
          }
        });

        if (hits.length === 0) {
          console.log("❌ no hit for point", p);
          return null;
        }

        hits.sort((a, b) => a.distance - b.distance);

        const hit = hits[0].point;

        console.log("✅ HIT:", hit);

        const distance = Math.sqrt((p.x - hit.x) ** 2 + (p.y - hit.y) ** 2);

        const mm = distance * 1000;

        const midX = (p.x + hit.x) / 2;
        const midY = (p.y + hit.y) / 2;

        return (
          <group key={i}>
            {/* 🔴 LINE */}
            <Line
              points={[
                [p.x, p.y, 2],
                [hit.x, hit.y, 2],
              ]}
              color="red"
              lineWidth={3}
              depthTest={false}
            />

            {/* 🔴 TEXT */}
            <Text
              position={[midX, midY, 3]}
              fontSize={0.4}
              color="red"
              depthTest={false}
            >
              {mm.toFixed(0)} mm
            </Text>
          </group>
        );
      })}
    </>
  );
}
