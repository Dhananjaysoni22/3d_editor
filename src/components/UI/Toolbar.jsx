import React from "react";
import { usePolygonStore } from "../Store/usePolygonStore";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";

function Toolbar() {
  const {
    clearPolygon,
    selectedPolygon,
    convertToMesh,
    closed,
    points,
    segments,
    setModel,
    model,
    generateSafeZoneFromModel,
    toggleEditCurve,
    generateFootprint,
    generateSafeZone,
    showSafeZone,
    footprintPoints,
  } = usePolygonStore();

  const exportGLB = () => {
    const scene = new THREE.Scene();

    // 🔹 ADD MODEL
    if (model) {
      scene.add(model.clone());
    }

    // 🔹 CREATE BASE
    const shape = new THREE.Shape();

    let started = false;

    segments.forEach((seg) => {
      const p1 = points.find((p) => p.id === seg.start);
      const p2 = points.find((p) => p.id === seg.end);

      if (!p1 || !p2) return;

      if (!started) {
        shape.moveTo(p1.x, p1.y);
        started = true;
      }

      if (seg.type === "line") {
        shape.lineTo(p2.x, p2.y);
      }

      if (seg.type === "bezier") {
        const curve = new THREE.CubicBezierCurve(
          new THREE.Vector2(p1.x, p1.y),
          new THREE.Vector2(seg.control1.x, seg.control1.y),
          new THREE.Vector2(seg.control2.x, seg.control2.y),
          new THREE.Vector2(p2.x, p2.y),
        );

        curve.getPoints(30).forEach((pt) => {
          shape.lineTo(pt.x, pt.y);
        });
      }
    });

    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.05,
      bevelEnabled: false,
    });

    const baseMesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: "green" }),
    );

    baseMesh.position.z = -1; // 🔥 BELOW model

    scene.add(baseMesh);

    // 🔹 EXPORT
    // const exporter = new GLTFExporter();

    const exporter = new GLTFExporter();

    exporter.parse(
      scene,
      (result) => {
        let blob;

        if (result instanceof ArrayBuffer) {
          // ✅ correct GLB
          blob = new Blob([result], { type: "model/gltf-binary" });
        } else {
          // ⚠️ fallback (GLTF JSON)
          blob = new Blob([JSON.stringify(result)], {
            type: "application/json",
          });
        }

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download =
          result instanceof ArrayBuffer ? "final.glb" : "final.gltf";
        link.click();
      },
      { binary: true },
    );
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    const loader = new GLTFLoader();

    // ✅ ADD DRACO SUPPORT
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

    loader.setDRACOLoader(dracoLoader);

    loader.load(url, (gltf) => {
      const model = gltf.scene;

      // 🔥 normalize model
      model.position.set(0, 0, 0);
      model.rotation.set(0, 0, 0);
      model.scale.set(1, 1, 1);

      // optional safety fixes (important for your raycasting work)
      model.traverse((child) => {
        if (child.isMesh) {
          child.material.side = THREE.DoubleSide;
          child.raycast = THREE.Mesh.prototype.raycast;
          child.geometry.computeBoundingBox();
          child.geometry.computeBoundingSphere();
        }
      });

      setModel(model);
    });
  };
  //   if (!selectedPolygon || !closed) return null;

  return (
    <div style={styles.container}>
      <button onClick={clearPolygon} style={styles.button}>
        Clear Polygon
      </button>
      <button onClick={convertToMesh} style={styles.button}>
        Convert to Mesh
      </button>
      <button style={styles.button} onClick={() => exportGLB(segments, points)}>
        Export GLB
      </button>
      <input type="file" accept=".glb,.gltf" onChange={handleUpload} />
      <button
        style={styles.button}
        onClick={() => generateSafeZoneFromModel(model)}
      >
        Auto Safezone
      </button>
      <button style={styles.button} onClick={() => toggleEditCurve()}>
        Edit Curve
      </button>
      <button onClick={() => generateFootprint(model)}>
        Auto Footprint {/* Screen 1+2: clean boundary + editable points */}
      </button>

      <button
        onClick={generateSafeZone}
        disabled={!footprintPoints.length} // only active after footprint exists
      >
        Generate 1500mm Offset {/* Screen 3: safety zone */}
      </button>
    </div>
  );
}

export default Toolbar;
const styles = {
  container: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 10,
  },
  button: {
    margin: "5px",
    padding: "8px 12px",
    background: "#ff4d4d",
    border: "none",
    color: "white",
    cursor: "pointer",
    borderRadius: "4px",
  },
};
