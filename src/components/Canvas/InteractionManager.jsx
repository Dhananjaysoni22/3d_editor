import { useThree } from "@react-three/fiber";
import { usePolygonStore } from "../Store/usePolygonStore";

export default function InteractionManager() {
  const { addPoint, points, setClosed, closed } = usePolygonStore();

  const handleClick = (event) => {
    event.stopPropagation();

    if (closed) return; // already closed

    const { x, y } = event.point;

    // 🔥 Check if clicked near first point
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

  return (
    <mesh position={[0, 0, -1]} onClick={handleClick}>
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}
