import { useEffect, useState } from "react";
import { usePolygonStore } from "../Store/usePolygonStore";

export default function PointsLayer() {
  const { points, updatePoint, setSelectedSegment } = usePolygonStore();
  const [draggingId, setDraggingId] = useState(null);
  useEffect(() => {
    const handleUp = () => setDraggingId(null);
    window.addEventListener("pointerup", handleUp);
    return () => window.removeEventListener("pointerup", handleUp);
  }, []);
  return (
    <>
      {points.map((p, i) => (
        <mesh
          key={p.id}
          position={[p.x, p.y, 0]}
          onPointerDown={(e) => {
            e.stopPropagation();
            setDraggingId(p.id);
            setSelectedSegment(null);
          }}
          onPointerUp={() => setDraggingId(null)}
          onPointerMove={(e) => {
            if (draggingId === p.id) {
              e.stopPropagation();
              updatePoint(p.id, {
                x: e.point.x,
                y: e.point.y,
              });
            }
          }}
        >
          <circleGeometry args={[0.2, 16]} />
          <meshBasicMaterial color={i === 0 ? "red" : "green"} />{" "}
        </mesh>
      ))}
    </>
  );
}
