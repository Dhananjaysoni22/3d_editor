import { useEffect, useState } from "react";
import { usePolygonStore } from "../Store/usePolygonStore";

export default function PointsLayer() {
  const {
    points,
    updatePoint,
    setSelectedSegment,
    measurementPointIds,
    toggleMeasurementPoint,
  } = usePolygonStore();
  const [draggingId, setDraggingId] = useState(null);
  const [dragMoved, setDragMoved] = useState(false);

  useEffect(() => {
    const handleUp = () => {
      setDraggingId(null);
      setDragMoved(false);
    };
    window.addEventListener("pointerup", handleUp);
    return () => window.removeEventListener("pointerup", handleUp);
  }, []);

  return (
    <>
      {points.map((p, i) => {
        const isMeasuring = measurementPointIds?.includes(p.id);

        return (
          <group key={p.id}>
            {/* Red ring around selected measurement points */}
            {isMeasuring && (
              <mesh position={[p.x, p.y, 0.04]}>
                <ringGeometry args={[0.22, 0.32, 32]} />
                <meshBasicMaterial color="red" />
              </mesh>
            )}

            <mesh
              position={[p.x, p.y, 0.1]}
              onPointerDown={(e) => {
                e.stopPropagation();
                setDraggingId(p.id);
                setDragMoved(false);
                setSelectedSegment(null);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                // Click = toggle measurement, Drag = move point
                if (!dragMoved) toggleMeasurementPoint(p.id);
                setDraggingId(null);
                setDragMoved(false);
              }}
              onPointerMove={(e) => {
                if (draggingId === p.id) {
                  e.stopPropagation();
                  setDragMoved(true);
                  updatePoint(p.id, { x: e.point.x, y: e.point.y });
                }
              }}
            >
              <circleGeometry args={[0.2, 16]} />
              <meshBasicMaterial
                color={isMeasuring ? "red" : i === 0 ? "red" : "green"}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
