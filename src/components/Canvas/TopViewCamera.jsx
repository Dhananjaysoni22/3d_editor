import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

export default function TopViewCamera() {
  const { camera } = useThree();

  useEffect(() => {
    camera.up.set(0, 0, -1);

    camera.lookAt(0, 0, 0);

    camera.updateProjectionMatrix();
  }, []);

  return null;
}
