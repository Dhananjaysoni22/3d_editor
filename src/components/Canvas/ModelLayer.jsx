import { useEffect } from "react";
import { usePolygonStore } from "../Store/usePolygonStore";
import * as THREE from "three";

export default function ModelLayer() {
  const { model, setModelBounds } = usePolygonStore();

  useEffect(() => {
    if (!model) return;

    model.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // ✅ CENTER MODEL
    model.position.sub(center);

    // ✅ APPLY ROTATION FIRST
    model.rotation.x = -Math.PI / 2;

    // ✅ UPDATE AGAIN AFTER ROTATION
    model.updateWorldMatrix(true, true);

    const newBox = new THREE.Box3().setFromObject(model);

    setModelBounds({
      min: newBox.min.clone(),
      max: newBox.max.clone(),
    });
  }, [model]);
  // model?.traverse((child) => {
  //   if (child.isMesh) {
  //     // 🔥 VERY IMPORTANT FIX
  //     child.material.side = THREE.DoubleSide;

  //     // 🔥 ensure raycast works
  //     child.raycast = THREE.Mesh.prototype.raycast;

  //     // 🔥 update geometry bounds
  //     child.geometry.computeBoundingBox();
  //     child.geometry.computeBoundingSphere();
  //   }
  // });
  if (!model) return null;

  return <primitive object={model} />;
}
