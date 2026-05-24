import * as THREE from "three";
import cv from "@techstark/opencv-js";

// ---------------------------------------------------
// SMART POLYGON CLEANUP
// ---------------------------------------------------

function cleanPolygonPoints(
    points,
    minDist = 0.03,
    minAngle = 4
) {
    if (points.length < 3) {
        return points;
    }

    const cleaned = [];

    for (let i = 0; i < points.length; i++) {
        const prev =
            points[
            (i - 1 + points.length) %
            points.length
            ];

        const curr = points[i];

        const next =
            points[
            (i + 1) %
            points.length
            ];

        // ----------------------------------------
        // DISTANCE CHECK
        // ----------------------------------------

        const dx = curr[0] - prev[0];

        const dz = curr[2] - prev[2];

        const dist = Math.sqrt(
            dx * dx + dz * dz
        );

        if (dist < minDist) {
            continue;
        }

        // ----------------------------------------
        // ANGLE CHECK
        // ----------------------------------------

        const v1x = prev[0] - curr[0];

        const v1z = prev[2] - curr[2];

        const v2x = next[0] - curr[0];

        const v2z = next[2] - curr[2];

        const dot =
            v1x * v2x + v1z * v2z;

        const mag1 = Math.sqrt(
            v1x * v1x + v1z * v1z
        );

        const mag2 = Math.sqrt(
            v2x * v2x + v2z * v2z
        );

        if (mag1 === 0 || mag2 === 0) {
            continue;
        }

        let cosine =
            dot / (mag1 * mag2);

        cosine = Math.max(
            -1,
            Math.min(1, cosine)
        );

        const angle =
            Math.acos(cosine) *
            (180 / Math.PI);

        // REMOVE ALMOST STRAIGHT POINTS
        if (
            Math.abs(180 - angle) <
            minAngle
        ) {
            continue;
        }

        cleaned.push(curr);
    }

    return cleaned;
}

// ---------------------------------------------------
// MAIN
// ---------------------------------------------------

export async function extractFootprint({
    renderer,
    model,
}) {
    // ---------------------------------------------------
    // HIGH RESOLUTION
    // ---------------------------------------------------

    const sizePx = 4096;

    // ---------------------------------------------------
    // MODEL BOUNDS
    // ---------------------------------------------------

    model.updateWorldMatrix(true, true);

    const box =
        new THREE.Box3().setFromObject(
            model
        );

    const center =
        new THREE.Vector3();

    const sizeVec =
        new THREE.Vector3();

    box.getCenter(center);

    box.getSize(sizeVec);

    // EXTRA PADDING
    const maxDim =
        Math.max(
            sizeVec.x,
            sizeVec.z
        ) * 0.7;

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

    camera.position.set(
        center.x,
        center.y + 100,
        center.z
    );

    camera.lookAt(
        center.x,
        center.y,
        center.z
    );

    camera.up.set(0, 0, -1);

    camera.updateProjectionMatrix();

    // ---------------------------------------------------
    // RENDER TARGET
    // ---------------------------------------------------

    const renderTarget =
        new THREE.WebGLRenderTarget(
            sizePx,
            sizePx,
            {
                samples: 8,
            }
        );

    // ---------------------------------------------------
    // TEMP SCENE
    // ---------------------------------------------------

    const tempScene =
        new THREE.Scene();

    tempScene.background =
        new THREE.Color("black");

    // ---------------------------------------------------
    // CLONE MODEL
    // ---------------------------------------------------

    const cloned =
        model.clone(true);

    // ---------------------------------------------------
    // PURE WHITE SILHOUETTE
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

    renderer.setRenderTarget(
        renderTarget
    );

    renderer.setClearColor(
        "black",
        1
    );

    renderer.clear();

    renderer.render(
        tempScene,
        camera
    );

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
    // CREATE IMAGE MAT
    // ---------------------------------------------------

    const mat = cv.matFromImageData(
        new ImageData(
            new Uint8ClampedArray(
                pixels
            ),
            sizePx,
            sizePx
        )
    );

    // ---------------------------------------------------
    // GRAYSCALE
    // ---------------------------------------------------

    const gray = new cv.Mat();

    cv.cvtColor(
        mat,
        gray,
        cv.COLOR_RGBA2GRAY
    );

    // ---------------------------------------------------
    // LIGHT BLUR
    // ---------------------------------------------------

    const blurred = new cv.Mat();

    cv.GaussianBlur(
        gray,
        blurred,
        new cv.Size(3, 3),
        0
    );

    // ---------------------------------------------------
    // THRESHOLD
    // ---------------------------------------------------

    const thresh = new cv.Mat();

    cv.threshold(
        blurred,
        thresh,
        200,
        255,
        cv.THRESH_BINARY
    );

    // ---------------------------------------------------
    // MORPH CLOSE ONLY
    // ---------------------------------------------------

    const kernel =
        cv.getStructuringElement(
            cv.MORPH_ELLIPSE,
            new cv.Size(3, 3)
        );

    cv.morphologyEx(
        thresh,
        thresh,
        cv.MORPH_CLOSE,
        kernel
    );

    // ---------------------------------------------------
    // FIND CONTOURS
    // ---------------------------------------------------

    const contours =
        new cv.MatVector();

    const hierarchy =
        new cv.Mat();

    cv.findContours(
        thresh,
        contours,
        hierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
    );

    // ---------------------------------------------------
    // GET BIGGEST CONTOUR
    // ---------------------------------------------------

    let biggest = null;

    let biggestArea = 0;

    for (
        let i = 0;
        i < contours.size();
        i++
    ) {
        const cnt = contours.get(i);

        const area =
            cv.contourArea(cnt);

        if (area > biggestArea) {
            biggestArea = area;
            biggest = cnt;
        }
    }

    // ---------------------------------------------------
    // NO CONTOUR
    // ---------------------------------------------------

    if (!biggest) {
        mat.delete();

        gray.delete();

        blurred.delete();

        thresh.delete();

        contours.delete();

        hierarchy.delete();

        kernel.delete();

        renderTarget.dispose();

        return [];
    }

    // ---------------------------------------------------
    // APPROXIMATE CONTOUR
    // ---------------------------------------------------

    const approx = new cv.Mat();

    const perimeter =
        cv.arcLength(biggest, true);

    // DETAIL PRESERVING
    const epsilon =
        perimeter * 0.0015;

    cv.approxPolyDP(
        biggest,
        approx,
        epsilon,
        true
    );

    // ---------------------------------------------------
    // PIXEL -> WORLD SPACE
    // ---------------------------------------------------

    let outlinePoints = [];

    for (
        let i = 0;
        i < approx.data32S.length;
        i += 2
    ) {
        const px =
            approx.data32S[i];

        const py =
            approx.data32S[i + 1];

        // NORMALIZED
        const nx = px / sizePx;

        const ny = py / sizePx;

        // WORLD X
        const worldX =
            ((nx * 2) - 1) *
            maxDim +
            center.x;

        // WORLD Z
        const worldZ =
            ((1 - ny) * 2 - 1) *
            maxDim +
            center.z;

        outlinePoints.push([
            worldX,
            0.05,
            worldZ,
        ]);
    }

    // ---------------------------------------------------
    // SMART CLEANUP
    // ---------------------------------------------------

    outlinePoints =
        cleanPolygonPoints(
            outlinePoints,
            0.03,
            4
        );

    // ---------------------------------------------------
    // CLOSE LOOP
    // ---------------------------------------------------

    if (
        outlinePoints.length > 0
    ) {
        outlinePoints.push(
            outlinePoints[0]
        );
    }

    // ---------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------

    mat.delete();

    gray.delete();

    blurred.delete();

    thresh.delete();

    contours.delete();

    hierarchy.delete();

    approx.delete();

    kernel.delete();

    renderTarget.dispose();

    // ---------------------------------------------------
    // RESULT
    // ---------------------------------------------------

    return outlinePoints;
}