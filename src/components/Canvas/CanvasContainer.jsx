import { Canvas } from "@react-three/fiber";
import PointsLayer from "./PointsLayer";
import SegmentsLayer from "./SegmentsLayer";
import InteractionManager from "./InteractionManager";
import ControlPointsLayer from "./ControlPointsLayer";
import { Grid } from "@react-three/drei";
import PolygonMeshLayer from "./PolygonMeshLayer";
import ModelLayer from "./ModelLayer";

export default function CanvasContainer() {
  return (
    <Canvas
      onPointerUp={() => window.dispatchEvent(new Event("pointerup"))}
      orthographic
      camera={{ zoom: 50, position: [0, 0, 10] }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      <Grid
        rotation={[Math.PI / 2, 0, 0]}
        infiniteGrid
        cellSize={1}
        sectionSize={3}
        fadeDistance={50}
        cellColor="#000000"
      />{" "}
      <color attach="background" args={["#ffffff"]} />
      <ModelLayer />
      <PointsLayer />
      <SegmentsLayer />
      <ControlPointsLayer />
      <PolygonMeshLayer />
      <InteractionManager />
    </Canvas>
  );
}
