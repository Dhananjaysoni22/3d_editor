import { Canvas } from "@react-three/fiber";
import PointsLayer from "./PointsLayer";
import SegmentsLayer from "./SegmentsLayer";
import InteractionManager from "./InteractionManager";
import ControlPointsLayer from "./ControlPointsLayer";
import { Grid } from "@react-three/drei";

export default function CanvasContainer() {
  return (
    <Canvas
      onPointerUp={() => window.dispatchEvent(new Event("pointerup"))}
      orthographic
      camera={{ zoom: 50, position: [0, 0, 10] }}
    >
      <Grid
        rotation={[Math.PI / 2, 0, 0]}
        infiniteGrid
        cellSize={1}
        sectionSize={3}
        fadeDistance={50}
        cellColor="#000000"
      />{" "}
      <color attach="background" args={["#ffffff"]} />
      <PointsLayer />
      <SegmentsLayer />
      <ControlPointsLayer />
      <InteractionManager />
    </Canvas>
  );
}
