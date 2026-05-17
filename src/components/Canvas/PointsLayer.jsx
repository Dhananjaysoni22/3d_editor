import { useEffect, useState } from "react";
import { usePolygonStore } from "../Store/usePolygonStore";

export default function PointsLayer() {
  const {
    safeZonePoints,

    updateSafeZonePoint,

    measurementPointIds,

    toggleMeasurementPoint,

    selectedSegmentIds,
  } = usePolygonStore();

  const points = safeZonePoints;

  const [draggingId, setDraggingId] = useState(null);

  const [dragMoved, setDragMoved] = useState(false);

  const isSegmentEditing = selectedSegmentIds.length > 0;

  useEffect(() => {
    const handleUp = () => {
      setDraggingId(null);

      setDragMoved(false);
    };

    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointerup", handleUp);
    };
  }, []);

  return (
    <>
      {points.map((p, i) => {
        const isMeasuring = measurementPointIds?.includes(p.id);

        return (
          <group key={p.id}>
            {/* RING */}
            {isMeasuring && (
              <mesh
                position={[p.x, 0.25, p.y]}
                rotation={[-Math.PI / 2, 0, 0]}
                renderOrder={999}
              >
                <ringGeometry args={[0.16, 0.22, 20]} />

                <meshBasicMaterial
                  color="red"
                  depthTest={false}
                  depthWrite={false}
                  polygonOffset
                  polygonOffsetFactor={-10}
                  polygonOffsetUnits={-10}
                />
              </mesh>
            )}

            {/* POINT */}
            <mesh
              position={[p.x, 0.3, p.y]}
              rotation={[-Math.PI / 2, 0, 0]}
              renderOrder={999}
              onPointerDown={(e) => {
                e.stopPropagation();

                if (isSegmentEditing) return;

                setDraggingId(p.id);

                setDragMoved(false);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();

                if (!dragMoved) {
                  toggleMeasurementPoint(p.id);
                }

                setDraggingId(null);

                setDragMoved(false);
              }}
              onPointerMove={(e) => {
                if (draggingId === p.id) {
                  e.stopPropagation();

                  if (isSegmentEditing) return;

                  setDragMoved(true);

                  updateSafeZonePoint(p.id, {
                    x: e.point.x,
                    y: e.point.z,
                  });
                }
              }}
            >
              <circleGeometry args={[0.12, 20]} />

              <meshBasicMaterial
                color={isMeasuring ? "red" : i === 0 ? "red" : "lime"}
                depthTest={false}
                depthWrite={false}
                polygonOffset
                polygonOffsetFactor={-10}
                polygonOffsetUnits={-10}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
