import { useEffect } from "react";
import { usePolygonStore } from "../Store/usePolygonStore";

import * as THREE from "three";

import { useThree } from "@react-three/fiber";

import { extractFootprint } from "../../utils/extractFootprint";

import { outlineToPolygon } from "../../utils/outlineToPolygon";

import { generateSafezone } from "../Services/geometryApi";

export default function ModelLayer() {
  const { gl, scene } = useThree();

  const {
    model,

    setModelBounds,

    cacheModelVertices,

    setOutlinePoints,
    components,
  } = usePolygonStore();

  useEffect(() => {
    if (!model) return;

    async function processModel() {
      // -----------------------------------
      // RESET MODEL
      // -----------------------------------

      model.position.set(0, 0, 0);

      model.rotation.set(0, 0, 0);

      model.scale.set(1, 1, 1);

      model.updateMatrixWorld(true);

      // -----------------------------------
      // CENTER MODEL
      // -----------------------------------

      const box = new THREE.Box3().setFromObject(model);

      const center = new THREE.Vector3();

      box.getCenter(center);

      model.position.set(-center.x, -center.y, -center.z);

      model.updateMatrixWorld(true);

      // -----------------------------------
      // SAVE BOUNDS
      // -----------------------------------

      const finalBox = new THREE.Box3().setFromObject(model);

      setModelBounds({
        min: finalBox.min.clone(),

        max: finalBox.max.clone(),
      });

      // -----------------------------------
      // CACHE MODEL
      // -----------------------------------

      cacheModelVertices(model);

      // -----------------------------------
      // EXTRACT FOOTPRINT
      // -----------------------------------

      const outline = await extractFootprint({
        renderer: gl,

        scene,

        model,
      });

      setOutlinePoints(outline);

      // -----------------------------------
      // POLYGON
      // -----------------------------------

      const polygon = outlineToPolygon(outline);

      // -----------------------------------
      // BACKEND SAFEZONE
      // -----------------------------------

      const result = await generateSafezone({
        points: polygon.points,

        segments: polygon.segments,
        components,
      });

      console.log(result);

      // -----------------------------------
      // SAVE TO STORE
      // -----------------------------------

      usePolygonStore.setState({
        // ORIGINAL POLYGON
        points: polygon.points,

        segments: polygon.segments,

        closed: true,

        // SAFEZONE
        safeZonePoints: result.points,
      });
    }

    processModel();
  }, [model, components]);

  if (!model) return null;

  return <primitive object={model} />;
}
