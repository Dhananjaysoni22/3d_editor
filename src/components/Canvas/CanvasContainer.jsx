import { Canvas } from "@react-three/fiber";
import PointsLayer from "./PointsLayer";
import SegmentsLayer from "./SegmentsLayer";
import InteractionManager from "./InteractionManager";
import ControlPointsLayer from "./ControlPointsLayer";
import { Grid } from "@react-three/drei";
import PolygonMeshLayer from "./PolygonMeshLayer";
import ModelLayer from "./ModelLayer";
import DistanceLayer from "./DistanceLayer";
import SafeZoneLayer from "./SafeZoneLayer";
import OutlineLayer from "./OutlineLayer";
import TopViewCamera from "./TopViewCamera";
import SafeZonePolygon from "./SafeZonePolygon";

export default function CanvasContainer() {
  return (
    <Canvas
      onPointerUp={() => window.dispatchEvent(new Event("pointerup"))}
      orthographic
      camera={{
        zoom: 50,
        position: [0, 100, 0],
        near: 0.1,
        far: 1000,
      }}
    >
      <TopViewCamera />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      <Grid
        infiniteGrid
        cellSize={1}
        sectionSize={3}
        fadeDistance={50}
        cellColor="#000000"
      />
      <color attach="background" args={["#ffffff"]} />
      <ModelLayer />
      {/* <OffsetLines /> */}
      {/* <IntersectionPolygon /> */}
      {/* <OutlineLayer /> */}
      {/* <DistanceLayer /> */}
      <PointsLayer />
      {/* <SafeZoneLayer /> */}
      <SafeZonePolygon />
      <SegmentsLayer />
      <ControlPointsLayer />
      <PolygonMeshLayer />
      <InteractionManager />
    </Canvas>
  );
}
