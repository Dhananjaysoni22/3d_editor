import CanvasContainer from "./components/Canvas/CanvasContainer";
import { usePolygonStore } from "../src/components/Store/usePolygonStore.js";
import Toolbar from "./components/UI/Toolbar.jsx";

function App() {
  const data = usePolygonStore();
  // console.log(data);
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Toolbar />
      <CanvasContainer />
    </div>
  );
}

export default App;
