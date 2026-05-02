import { usePolygonStore } from "../Store/usePolygonStore";

export default function ModelLayer() {
  const { model } = usePolygonStore();

  if (!model) return null;
  model.rotation.x = -Math.PI / 2;
  return <primitive object={model} />;
}
