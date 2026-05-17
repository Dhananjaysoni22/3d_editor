import { useEffect } from "react";
import { usePolygonStore } from "../Store/usePolygonStore";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { extractFootprint } from "../../utils/extractFootprint";
import { outlineToPolygon } from "../../utils/outlineToPolygon";
import { generateOffsetPolygon } from "../../utils/generateOffsetPolygon";

export default function ModelLayer() {
  const { gl, scene } = useThree();

  const { model, setModelBounds, cacheModelVertices, setOutlinePoints } =
    usePolygonStore();

  useEffect(() => {
    if (!model) return;

    async function processModel() {
      // RESET MODEL
      model.position.set(0, 0, 0);
      model.rotation.set(0, 0, 0);
      model.scale.set(1, 1, 1);

      model.updateMatrixWorld(true);

      // CENTER MODEL
      const box = new THREE.Box3().setFromObject(model);

      const center = new THREE.Vector3();

      box.getCenter(center);

      model.position.set(-center.x, -center.y, -center.z);

      model.updateMatrixWorld(true);

      // SAVE BOUNDS
      const finalBox = new THREE.Box3().setFromObject(model);

      setModelBounds({
        min: finalBox.min.clone(),
        max: finalBox.max.clone(),
      });

      // CACHE
      cacheModelVertices(model);

      // EXTRACT FOOTPRINT
      const outline = await extractFootprint({
        renderer: gl,
        scene,
        model,
      });

      setOutlinePoints(outline);

      const polygon = outlineToPolygon(outline);

      const safeZone = generateOffsetPolygon(
        polygon.points,
        1.5, // 1500 mm
      );

      usePolygonStore.setState({
        points: polygon.points,
        segments: polygon.segments,
        closed: true,
        safeZonePoints: safeZone.points,
        safeZoneSegments: safeZone.segments,
      });
      console.log(safeZone.segments);
    }
    processModel();
  }, [model]);

  if (!model) return null;

  return <primitive object={model} />;
}
