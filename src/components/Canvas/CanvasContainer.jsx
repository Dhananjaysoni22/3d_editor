import { Canvas } from "@react-three/fiber";
import PointsLayer from "./PointsLayer";
import SegmentsLayer from "./SegmentsLayer";
import InteractionManager from "./InteractionManager";
import ControlPointsLayer from "./ControlPointsLayer";
export default function CanvasContainer() {
  return (
    <Canvas
      onPointerUp={() => window.dispatchEvent(new Event("pointerup"))}
      orthographic
      camera={{ zoom: 50, position: [0, 0, 10] }}
    >
      <color attach="background" args={["#111"]} />

      <PointsLayer />
      <SegmentsLayer />
      <ControlPointsLayer />
      <InteractionManager />
    </Canvas>
  );
}
