import CanvasContainer from "./components/Canvas/CanvasContainer";
import { usePolygonStore } from "../src/components/Store/usePolygonStore.js";

function App() {
  const data = usePolygonStore();
  console.log(data);
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <CanvasContainer />
    </div>
  );
}

export default App;
