import React from "react";
import { usePolygonStore } from "../Store/usePolygonStore";

function Toolbar() {
  const { clearPolygon } = usePolygonStore();

  return (
    <div style={styles.container}>
      <button onClick={clearPolygon} style={styles.button}>
        Clear Polygon
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
    padding: "8px 12px",
    background: "#ff4d4d",
    border: "none",
    color: "white",
    cursor: "pointer",
    borderRadius: "4px",
  },
};
