import { useState, useEffect } from "react";
import { usePolygonStore } from "../Store/usePolygonStore";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function ControlPointsLayer() {
  const { segments, points, updateSegment, selectedSegment } =
    usePolygonStore();

  const [dragging, setDragging] = useState(null);

  const { raycaster, camera, mouse } = useThree();

  const getPoint = (id) => points.find((p) => p.id === id);

  // 🔥 release anywhere
  useEffect(() => {
    const handleUp = () => setDragging(null);
    window.addEventListener("pointerup", handleUp);
    return () => window.removeEventListener("pointerup", handleUp);
  }, []);

  // 🔥 REAL-TIME DRAG (MAIN FIX)
  useFrame(() => {
    if (!dragging) return;

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const point = new THREE.Vector3();

    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(plane, point);

    updateSegment(dragging.segId, {
      [dragging.type === "c1" ? "control1" : "control2"]: {
        x: point.x,
        y: point.y,
      },
    });
  });

  return (
    <>
      {segments.map((seg) => {
        if (seg.type !== "bezier" || seg.id !== selectedSegment) return null;

        const p1 = getPoint(seg.start);
        const p2 = getPoint(seg.end);

        if (!p1 || !p2) return null;

        return (
          <group key={seg.id}>
            {/* 🔥 Helper line: p1 → control1 */}
            <line key={`${seg.id}-c1-${seg.control1.x}-${seg.control1.y}`}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  array={
                    new Float32Array([
                      p1.x,
                      p1.y,
                      0,
                      seg.control1.x,
                      seg.control1.y,
                      0,
                    ])
                  }
                  count={2}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="gray" />
            </line>

            {/* 🔥 Helper line: p2 → control2 */}
            <line key={`${seg.id}-c2-${seg.control2.x}-${seg.control2.y}`}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  array={
                    new Float32Array([
                      p2.x,
                      p2.y,
                      0,
                      seg.control2.x,
                      seg.control2.y,
                      0,
                    ])
                  }
                  count={2}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="gray" />
            </line>

            {/* 🔹 Control Point 1 */}
            <mesh
              position={[seg.control1.x, seg.control1.y, 0.1]}
              onPointerDown={(e) => {
                e.stopPropagation();
                setDragging({ segId: seg.id, type: "c1" });
              }}
              onPointerOver={() => (document.body.style.cursor = "pointer")}
              onPointerOut={() => (document.body.style.cursor = "default")}
            >
              <circleGeometry args={[0.5, 16]} />
              <meshBasicMaterial color="hotpink" depthTest={false} />
            </mesh>

            {/* 🔹 Control Point 2 */}
            <mesh
              position={[seg.control2.x, seg.control2.y, 0.1]}
              onPointerDown={(e) => {
                e.stopPropagation();
                setDragging({ segId: seg.id, type: "c2" });
              }}
              onPointerOver={() => (document.body.style.cursor = "pointer")}
              onPointerOut={() => (document.body.style.cursor = "default")}
            >
              <circleGeometry args={[0.5, 16]} />
              <meshBasicMaterial color="hotpink" depthTest={false} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
