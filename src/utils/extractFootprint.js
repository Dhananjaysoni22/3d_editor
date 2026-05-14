import * as THREE from "three";
import cv from "@techstark/opencv-js";

export async function extractFootprint({
    renderer,
    model,
}) {
    const sizePx = 1024;

    // ---------------------------------------------------
    // MODEL BOUNDS
    // ---------------------------------------------------

    model.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(model);

    const center = new THREE.Vector3();
    const sizeVec = new THREE.Vector3();

    box.getCenter(center);
    box.getSize(sizeVec);

    // XZ = FLOOR
    const maxDim =
        Math.max(sizeVec.x, sizeVec.z) * 0.6;

    // ---------------------------------------------------
    // TRUE TOP CAMERA
    // ---------------------------------------------------

    const camera =
        new THREE.OrthographicCamera(
            -maxDim,
            maxDim,
            maxDim,
            -maxDim,
            0.1,
            1000
        );

    // LOOK FROM TOP
    camera.position.set(
        center.x,
        center.y + 100,
        center.z
    );

    // LOOK DOWN
    camera.lookAt(
        center.x,
        center.y,
        center.z
    );

    // IMPORTANT
    camera.up.set(0, 0, -1);

    camera.updateProjectionMatrix();

    // ---------------------------------------------------
    // RENDER TARGET
    // ---------------------------------------------------

    const renderTarget =
        new THREE.WebGLRenderTarget(
            sizePx,
            sizePx
        );

    // ---------------------------------------------------
    // TEMP SCENE
    // ---------------------------------------------------

    const tempScene = new THREE.Scene();

    tempScene.background =
        new THREE.Color("black");

    // ---------------------------------------------------
    // CLONE MODEL
    // ---------------------------------------------------

    const cloned = model.clone(true);

    // ---------------------------------------------------
    // WHITE SILHOUETTE MATERIAL
    // ---------------------------------------------------

    cloned.traverse((child) => {
        if (child.isMesh) {
            child.material =
                new THREE.MeshBasicMaterial({
                    color: "white",
                });
        }
    });

    tempScene.add(cloned);

    // ---------------------------------------------------
    // RENDER SILHOUETTE
    // ---------------------------------------------------

    renderer.setRenderTarget(renderTarget);

    renderer.setClearColor("black", 1);

    renderer.clear();

    renderer.render(tempScene, camera);

    // ---------------------------------------------------
    // READ PIXELS
    // ---------------------------------------------------

    const pixels = new Uint8Array(
        sizePx * sizePx * 4
    );

    renderer.readRenderTargetPixels(
        renderTarget,
        0,
        0,
        sizePx,
        sizePx,
        pixels
    );

    renderer.setRenderTarget(null);

    // ---------------------------------------------------
    // DEBUG VIEW (OPTIONAL)
    // ---------------------------------------------------

    /*
    const canvas = document.createElement("canvas");
  
    canvas.width = sizePx;
    canvas.height = sizePx;
  
    const ctx = canvas.getContext("2d");
  
    const imageData = new ImageData(
      new Uint8ClampedArray(pixels),
      sizePx,
      sizePx
    );
  
    ctx.putImageData(imageData, 0, 0);
  
    document.body.appendChild(canvas);
    */

    // ---------------------------------------------------
    // OPENCV
    // ---------------------------------------------------

    const mat = cv.matFromImageData(
        new ImageData(
            new Uint8ClampedArray(pixels),
            sizePx,
            sizePx
        )
    );

    const gray = new cv.Mat();

    cv.cvtColor(
        mat,
        gray,
        cv.COLOR_RGBA2GRAY
    );

    const thresh = new cv.Mat();

    // IMPORTANT
    cv.threshold(
        gray,
        thresh,
        200,
        255,
        cv.THRESH_BINARY
    );

    // ---------------------------------------------------
    // FIND CONTOURS
    // ---------------------------------------------------

    const contours = new cv.MatVector();

    const hierarchy = new cv.Mat();

    cv.findContours(
        thresh,
        contours,
        hierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
    );

    // ---------------------------------------------------
    // LARGEST CONTOUR
    // ---------------------------------------------------

    let biggest = null;

    let biggestArea = 0;

    for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);

        const area = cv.contourArea(cnt);

        if (area > biggestArea) {
            biggestArea = area;
            biggest = cnt;
        }
    }

    if (!biggest) {
        return [];
    }

    // ---------------------------------------------------
    // SIMPLIFY CONTOUR
    // ---------------------------------------------------

    const approx = new cv.Mat();

    cv.approxPolyDP(
        biggest,
        approx,
        2,
        true
    );

    // ---------------------------------------------------
    // PIXEL → WORLD SPACE
    // ---------------------------------------------------

    const outlinePoints = [];

    for (
        let i = 0;
        i < approx.data32S.length;
        i += 2
    ) {
        const px = approx.data32S[i];

        const py = approx.data32S[i + 1];

        // NORMALIZED
        const nx = px / sizePx;

        const ny = py / sizePx;

        // WORLD X
        const worldX =
            ((nx * 2) - 1) * maxDim +
            center.x;

        // WORLD Z
        const worldZ =
            ((1 - ny) * 2 - 1) *
            maxDim +
            center.z;

        // XZ FLOOR
        outlinePoints.push([
            worldX,
            0.05,
            worldZ,
        ]);
    }

    // CLOSE LOOP
    if (outlinePoints.length > 0) {
        outlinePoints.push(outlinePoints[0]);
    }

    // ---------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------

    mat.delete();
    gray.delete();
    thresh.delete();
    contours.delete();
    hierarchy.delete();
    approx.delete();

    renderTarget.dispose();

    return outlinePoints;
}