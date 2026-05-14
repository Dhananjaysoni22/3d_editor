import { Line } from "@react-three/drei";
import { usePolygonStore } from "../Store/usePolygonStore";

export default function OutlineLayer() {
  const { outlinePoints } = usePolygonStore();

  if (!outlinePoints?.length) return null;

  return <Line points={outlinePoints} color="red" lineWidth={3} />;
}
