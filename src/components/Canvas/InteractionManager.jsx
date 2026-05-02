import { useThree } from "@react-three/fiber";
import { usePolygonStore } from "../Store/usePolygonStore";
import * as THREE from "three";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export default function InteractionManager() {
  const {
    addPoint,
    points,
    setClosed,
    closed,
    deselectPolygon,
    selectPolygon,
    selectedPolygon,
    startPolygonDrag,
    stopPolygonDrag,
    movePolygon,
    isPointInsidePolygon,
  } = usePolygonStore();
  const last = useRef(new THREE.Vector3());

  const handleClick = (event) => {
    event.stopPropagation();
    const { x, y } = event.point;

    if (closed && !isPointInsidePolygon(x, y)) {
      deselectPolygon();
    }

    if (closed) return;

    if (points.length >= 3) {
      const first = points[0];

      const distance = Math.sqrt((first.x - x) ** 2 + (first.y - y) ** 2);

      if (distance < 0.5) {
        setClosed(true);
        return;
      }
    }

    // Otherwise add new point
    addPoint({ x, y });
  };
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    const { x, y } = e.point;

    if (closed && isPointInsidePolygon(x, y)) {
      selectPolygon();
    }
  };
  const handlePointerDown = (e) => {
    if (!selectedPolygon) return;

    // 🚫 DO NOT drag if clicking on point
    if (e.object.geometry?.type === "CircleGeometry") return;

    e.stopPropagation();

    last.current.copy(e.point);
    startPolygonDrag();
  };
  const handlePointerUp = () => {
    stopPolygonDrag();
  };
  useFrame((state) => {
    const { isDraggingPolygon } = usePolygonStore.getState();
    if (!isDraggingPolygon) return;

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const point = new THREE.Vector3();

    state.raycaster.setFromCamera(state.mouse, state.camera);
    state.raycaster.ray.intersectPlane(plane, point);

    const dx = point.x - last.current.x;
    const dy = point.y - last.current.y;

    movePolygon(dx, dy);

    last.current.copy(point);
  });
  return (
    <mesh
      position={[0, 0, -1]}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}
