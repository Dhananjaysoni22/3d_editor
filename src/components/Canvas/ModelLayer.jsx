import { useEffect } from "react";
import { usePolygonStore } from "../Store/usePolygonStore";
import * as THREE from "three";

export default function ModelLayer() {
  const { model, setModelBounds, cacheModelVertices } = usePolygonStore();

  useEffect(() => {
    if (!model) return;

    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);
    model.scale.set(1, 1, 1);
    model.updateMatrixWorld(true);

    model.rotation.x = -Math.PI / 2;
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);

    model.position.set(-center.x, -center.y, -center.z);
    model.updateMatrixWorld(true);

    const finalBox = new THREE.Box3().setFromObject(model);
    setModelBounds({
      min: finalBox.min.clone(),
      max: finalBox.max.clone(),
    });

    // ✅ Safe zone generated AFTER model is in final position
    // Remove this line if you want manual trigger only
    cacheModelVertices(model);
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
