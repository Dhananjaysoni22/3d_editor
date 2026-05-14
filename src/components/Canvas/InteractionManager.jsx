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

  // -----------------------------------
  // CLICK
  // -----------------------------------

  const handleClick = (event) => {
    event.stopPropagation();

    // XZ FLOOR
    const x = event.point.x;
    const y = event.point.z;

    if (closed && !isPointInsidePolygon(x, y)) {
      deselectPolygon();
    }

    if (closed) return;

    // CLOSE POLYGON
    if (points.length >= 3) {
      const first = points[0];

      const distance = Math.sqrt((first.x - x) ** 2 + (first.y - y) ** 2);

      if (distance < 0.5) {
        setClosed(true);

        return;
      }
    }

    // ADD POINT
    addPoint({ x, y });
  };

  // -----------------------------------
  // DOUBLE CLICK
  // -----------------------------------

  const handleDoubleClick = (e) => {
    e.stopPropagation();

    const x = e.point.x;
    const y = e.point.z;

    if (closed && isPointInsidePolygon(x, y)) {
      selectPolygon();
    }
  };

  // -----------------------------------
  // START DRAG
  // -----------------------------------

  const handlePointerDown = (e) => {
    if (!selectedPolygon) return;

    // avoid dragging when clicking point
    if (e.object.geometry?.type === "CircleGeometry") return;

    e.stopPropagation();

    last.current.copy(e.point);

    startPolygonDrag();
  };

  // -----------------------------------
  // STOP DRAG
  // -----------------------------------

  const handlePointerUp = () => {
    stopPolygonDrag();
  };

  // -----------------------------------
  // DRAG UPDATE
  // -----------------------------------

  useFrame((state) => {
    const { isDraggingPolygon } = usePolygonStore.getState();

    if (!isDraggingPolygon) return;

    // XZ FLOOR PLANE
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    const point = new THREE.Vector3();

    state.raycaster.setFromCamera(state.mouse, state.camera);

    state.raycaster.ray.intersectPlane(plane, point);

    const dx = point.x - last.current.x;

    const dy = point.z - last.current.z;

    movePolygon(dx, dy);

    last.current.copy(point);
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <planeGeometry args={[1000, 1000]} />

      <meshBasicMaterial visible={false} />
    </mesh>
  );
}
