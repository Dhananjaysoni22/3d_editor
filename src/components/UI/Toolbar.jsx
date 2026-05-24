// Toolbar.jsx

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

    safeZoneSegments,

    safeZonePoints,

    setModel,

    model,

    generateSafeZoneFromModel,

    toggleEditCurve,

    generateFootprint,

    generateSafeZone,

    showSafeZone,

    footprintPoints,

    // =====================================================
    // NEW
    // =====================================================

    selectedSegment,

    components,

    addComponent,

    removeComponent,
  } = usePolygonStore();

  // =====================================================
  // SAFEZONE DATA
  // =====================================================

  const points = safeZonePoints;

  const segments = safeZoneSegments;

  // =====================================================
  // ADD COMPONENT
  // =====================================================

  const assignComponent = (type, safeOffset) => {
    if (!selectedSegment) {
      alert("Select a segment first");

      return;
    }

    // REMOVE OLD COMPONENT
    removeComponent(selectedSegment);

    // ADD NEW COMPONENT

    addComponent({
      id: crypto.randomUUID(),

      type,

      segmentIds: [selectedSegment],

      safeOffset,
    });
  };

  // =====================================================
  // EXPORT GLB
  // =====================================================

  const exportGLB = () => {
    const scene = new THREE.Scene();

    // 🔹 ADD MODEL

    if (model) {
      scene.add(model.clone());
    }

    // =====================================================
    // ALIGNMENT
    // =====================================================

    const xs = points.map((p) => p.x);

    const ys = points.map((p) => p.y);

    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;

    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

    let modelCenterX = 0;

    let modelCenterZ = 0;

    let groundY = -0.01;

    if (model) {
      const bbox = new THREE.Box3().setFromObject(model);

      const center = new THREE.Vector3();

      bbox.getCenter(center);

      modelCenterX = center.x;

      modelCenterZ = center.z;

      groundY = bbox.min.y - 0.01;
    }

    const offsetX = modelCenterX - centerX;

    const offsetZ = modelCenterZ + centerY;

    // =====================================================
    // BUILD SHAPE
    // =====================================================

    const shape = new THREE.Shape();

    let started = false;

    segments.forEach((seg) => {
      const p1 = points.find((p) => p.id === seg.start);

      const p2 = points.find((p) => p.id === seg.end);

      if (!p1 || !p2) {
        return;
      }

      if (!started) {
        shape.moveTo(p1.x, -p1.y);

        started = true;
      }

      if (seg.type === "line") {
        shape.lineTo(p2.x, -p2.y);
      }

      if (seg.type === "bezier") {
        const curve = new THREE.CubicBezierCurve(
          new THREE.Vector2(p1.x, -p1.y),

          new THREE.Vector2(seg.control1.x, -seg.control1.y),

          new THREE.Vector2(seg.control2.x, -seg.control2.y),

          new THREE.Vector2(p2.x, -p2.y),
        );

        curve.getPoints(30).forEach((pt) => {
          shape.lineTo(pt.x, pt.y);
        });
      }
    });

    shape.closePath();

    // =====================================================
    // EXTRUDE
    // =====================================================

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.05,

      bevelEnabled: false,
    });

    const baseMesh = new THREE.Mesh(
      geometry,

      new THREE.MeshStandardMaterial({
        color: "green",
      }),
    );

    baseMesh.rotation.x = -Math.PI / 2;

    baseMesh.position.set(offsetX, groundY, offsetZ);

    scene.add(baseMesh);

    // =====================================================
    // EXPORT
    // =====================================================

    const exporter = new GLTFExporter();

    exporter.parse(
      scene,

      (result) => {
        let blob;

        if (result instanceof ArrayBuffer) {
          blob = new Blob([result], {
            type: "model/gltf-binary",
          });
        } else {
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

  // =====================================================
  // UPLOAD
  // =====================================================

  const handleUpload = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const url = URL.createObjectURL(file);

    const loader = new GLTFLoader();

    const dracoLoader = new DRACOLoader();

    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

    loader.setDRACOLoader(dracoLoader);

    loader.load(url, (gltf) => {
      const model = gltf.scene;

      model.position.set(0, 0, 0);

      model.rotation.set(0, 0, 0);

      model.scale.set(1, 1, 1);

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

  // =====================================================
  // UI
  // =====================================================

  return (
    <div style={styles.container}>
      {/* =====================================================
          MAIN TOOLS
      ===================================================== */}

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

      <button onClick={() => generateFootprint(model)}>Auto Footprint</button>

      <button onClick={generateSafeZone} disabled={!footprintPoints.length}>
        Generate 1500mm Offset
      </button>

      {/* =====================================================
          COMPONENT EDITOR
      ===================================================== */}

      <div style={styles.panel}>
        <div style={styles.title}>Component Editor</div>

        <div style={styles.segmentText}>
          Selected: {selectedSegment || "None"}
        </div>

        {/* =====================================================
            COMPONENT BUTTONS
        ===================================================== */}

        <button
          style={styles.orangeButton}
          onClick={() => assignComponent("slide", 2.5)}
        >
          Assign Slide
        </button>

        <button
          style={styles.blueButton}
          onClick={() => assignComponent("tower", 1.5)}
        >
          Assign Tower
        </button>

        <button
          style={styles.greenButton}
          onClick={() => assignComponent("tunnel", 1.2)}
        >
          Assign Tunnel
        </button>

        <button
          style={styles.purpleButton}
          onClick={() => assignComponent("ladder", 1.0)}
        >
          Assign Ladder
        </button>
      </div>

      {/* =====================================================
          COMPONENT LIST
      ===================================================== */}

      <div style={styles.panel}>
        <div style={styles.title}>Components</div>

        {components.length === 0 && (
          <div style={styles.empty}>No components</div>
        )}

        {components.map((component) => (
          <div key={component.id} style={styles.componentCard}>
            <div>Type: {component.type}</div>

            <div>Segment: {component.segmentIds.join(", ")}</div>

            <div>Offset: {component.safeOffset}m</div>
          </div>
        ))}
      </div>
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

    display: "flex",

    flexDirection: "column",

    gap: "10px",
  },

  panel: {
    background: "#1e1e1e",

    padding: "12px",

    borderRadius: "8px",

    width: "260px",

    display: "flex",

    flexDirection: "column",

    gap: "8px",

    color: "white",
  },

  title: {
    fontWeight: "bold",

    fontSize: "16px",
  },

  segmentText: {
    fontSize: "14px",

    color: "#ccc",
  },

  empty: {
    color: "#888",

    fontSize: "13px",
  },

  componentCard: {
    background: "#2d2d2d",

    padding: "8px",

    borderRadius: "6px",

    fontSize: "13px",

    display: "flex",

    flexDirection: "column",

    gap: "4px",
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

  orangeButton: {
    padding: "8px",

    background: "orange",

    border: "none",

    color: "black",

    cursor: "pointer",

    borderRadius: "4px",
  },

  blueButton: {
    padding: "8px",

    background: "#4d8dff",

    border: "none",

    color: "white",

    cursor: "pointer",

    borderRadius: "4px",
  },

  greenButton: {
    padding: "8px",

    background: "#2ecc71",

    border: "none",

    color: "white",

    cursor: "pointer",

    borderRadius: "4px",
  },

  purpleButton: {
    padding: "8px",

    background: "#9b59b6",

    border: "none",

    color: "white",

    cursor: "pointer",

    borderRadius: "4px",
  },
};
