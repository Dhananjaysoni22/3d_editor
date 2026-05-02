import React from "react";
import { usePolygonStore } from "../Store/usePolygonStore";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
function Toolbar() {
  const {
    clearPolygon,
    selectedPolygon,
    convertToMesh,
    closed,
    points,
    segments,
  } = usePolygonStore();

  const exportGLB = (segments, points) => {
    if (!segments || segments.length === 0) return;

    const getPoint = (id) => points.find((p) => p.id === id);

    const shape = new THREE.Shape();
    let started = false;

    segments.forEach((seg) => {
      const p1 = getPoint(seg.start);
      const p2 = getPoint(seg.end);

      if (!p1 || !p2) return;

      // 🔹 start shape
      if (!started) {
        shape.moveTo(p1.x, p1.y);
        started = true;
      }

      // 🔹 LINE
      if (seg.type === "line") {
        shape.lineTo(p2.x, p2.y);
      }

      // 🔹 BEZIER
      if (seg.type === "bezier") {
        const curve = new THREE.CubicBezierCurve(
          new THREE.Vector2(p1.x, p1.y),
          new THREE.Vector2(seg.control1.x, seg.control1.y),
          new THREE.Vector2(seg.control2.x, seg.control2.y),
          new THREE.Vector2(p2.x, p2.y),
        );

        const curvePoints = curve.getPoints(20); // smoothness

        curvePoints.forEach((pt) => {
          shape.lineTo(pt.x, pt.y);
        });
      }
    });

    shape.closePath();

    // 🔥 EXTRUDE
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 2,
      bevelEnabled: false,
    });

    const material = new THREE.MeshStandardMaterial({ color: "green" });
    const mesh = new THREE.Mesh(geometry, material);

    const scene = new THREE.Scene();
    scene.add(mesh);

    const exporter = new GLTFExporter();

    exporter.parse(
      scene,
      (result) => {
        let blob;

        if (result instanceof ArrayBuffer) {
          blob = new Blob([result], { type: "model/gltf-binary" });
        } else {
          blob = new Blob([JSON.stringify(result)], {
            type: "application/json",
          });
        }

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "polygon.glb";
        link.click();
      },
      { binary: true },
    );
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
