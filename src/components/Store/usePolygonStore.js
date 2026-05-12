import { create } from "zustand";
import concaveman from "concaveman";
import * as THREE from "three";
import simplify from "simplify-js";

export const usePolygonStore = create((set, get) => ({
    points: [],
    segments: [],
    closed: false,
    selectedSegment: null,
    selectedPolygon: false,
    isDraggingPolygon: false,
    isMesh: false,
    model: null,
    modelBounds: null,
    measurementPointIds: [],
    editCurve: false,
    footprintPoints: [],      // main product boundary (no offset)
    footprintSegments: [],    // main boundary segments
    safeZonePoints: [],       // 1500mm offset zone
    safeZoneSegments: [],     // offset segments
    showSafeZone: false,      // toggle
    outlinePoints: [],

    updateSafeZonePoint: (id, newPos) =>
        set((state) => ({
            safeZonePoints: state.safeZonePoints.map((p) =>
                p.id === id
                    ? { ...p, ...newPos }
                    : p
            ),
        })),

    setOutlinePoints: (points) =>
        set({ outlinePoints: points }),

    setModelBounds: (box) => set({ modelBounds: box }),

    setModel: (model) => set({ model }),

    convertToMesh: () => set({ isMesh: true }),
    selectPolygon: () => set({ selectedPolygon: true }),
    deselectPolygon: () => set({ selectedPolygon: false }),

    startPolygonDrag: () => set({ isDraggingPolygon: true }),
    stopPolygonDrag: () => set({ isDraggingPolygon: false }),

    toggleEditCurve: () => set((state) => (({
        editCurve: !state.editCurve
    }))),

    clearPolygon: () =>
        set({
            points: [],
            segments: [],
            closed: false,
            selectedSegment: false,
            selectedPolygon: false,
            isMesh: false,
        }),

    // 🔹 Add Point + Auto Create Segment
    addPoint: (point) => {
        const id = Date.now();

        set((state) => {
            const newPoints = [...state.points, { ...point, id }];

            // create segment automatically
            if (newPoints.length > 1) {
                const prev = newPoints[newPoints.length - 2];

                return {
                    points: newPoints,
                    segments: [
                        ...state.segments,
                        {
                            id: `${prev.id}-${id}`,
                            start: prev.id,
                            end: id,
                            type: "line"
                        }
                    ]
                };
            }

            return { points: newPoints };
        });
    },

    // 🔹 Update Point (dragging)
    updatePoint: (id, newPos) =>
        set((state) => {
            const oldPoint = state.points.find((p) => p.id === id);
            if (!oldPoint) return state;

            const dx = newPos.x - oldPoint.x;
            const dy = newPos.y - oldPoint.y;

            return {
                // ✅ update point
                points: state.points.map((p) =>
                    p.id === id ? { ...p, ...newPos } : p
                ),

                // 🔥 IMPORTANT: also update connected bezier segments
                segments: state.segments.map((seg) => {
                    if (seg.type !== "bezier") return seg;

                    // if this segment is connected to moved point
                    if (seg.start === id || seg.end === id) {
                        return {
                            ...seg,

                            // move control points along with vertex
                            control1: {
                                x: seg.control1.x + dx,
                                y: seg.control1.y + dy,
                            },
                            control2: {
                                x: seg.control2.x + dx,
                                y: seg.control2.y + dy,
                            },
                        };
                    }

                    return seg;
                }),
            };
        }),

    // 🔹 Close Polygon + Add Last Segment
    setClosed: (val) => {
        if (!val) return set({ closed: false });

        const { points, segments, closed } = get();

        if (closed || points.length < 3) return;

        const first = points[0];
        const last = points[points.length - 1];

        set({
            closed: true,
            segments: [
                ...segments,
                {
                    id: `${last.id}-${first.id}`,
                    start: last.id,
                    end: first.id,
                    type: "line"
                }
            ]
        });
    },

    // 🔹 Convert Line → Curve
    convertToCurve: (segmentId) =>
        set((state) => ({
            segments: state.segments.map((s) => {
                if (s.id !== segmentId) return s;

                const p1 = state.points.find((p) => p.id === s.start);
                const p2 = state.points.find((p) => p.id === s.end);

                if (!p1 || !p2) return s;

                return {
                    ...s,
                    type: "bezier",
                    control1: {
                        x: (p1.x + p2.x) / 2,
                        y: p1.y + 1   // 👈 offset REQUIRED
                    },
                    control2: {
                        x: (p1.x + p2.x) / 2,
                        y: p2.y - 1   // 👈 offset REQUIRED
                    }
                };
            })
        })),

    // 🔹 Update Curve Control Points
    updateSegment: (id, newData) =>
        set((state) => ({
            segments: state.segments.map((s) =>
                s.id === id ? { ...s, ...newData } : s
            )
        })),
    setSelectedSegment: (id) => set({ selectedSegment: id }),
    movePolygon: (dx, dy) =>
        set((state) => ({
            points: state.points.map((p) => ({
                ...p,
                x: p.x + dx,
                y: p.y + dy,
            })),

            segments: state.segments.map((seg) => {
                if (seg.type !== "bezier") return seg;

                return {
                    ...seg,
                    control1: {
                        x: seg.control1.x + dx,
                        y: seg.control1.y + dy,
                    },
                    control2: {
                        x: seg.control2.x + dx,
                        y: seg.control2.y + dy,
                    },
                };
            }),
        })),
    isPointInsidePolygon: (x, y) => {
        const { points } = get();

        let inside = false;

        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;

            const intersect =
                yi > y !== yj > y &&
                x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

            if (intersect) inside = !inside;
        }

        return inside;
    },
    generateSafeZoneFromModel: (model) => {
        if (!model) return;

        const rawPoints = [];
        const v = new THREE.Vector3();

        model.updateMatrixWorld(true);

        // =========================================
        // STEP 1: SAMPLE VERTICES
        // ↓ Was 20 — too sparse, missing geometry
        // =========================================
        const SAMPLE_STEP = 5;

        model.traverse((child) => {
            if (!child.isMesh || !child.geometry?.attributes?.position) return;

            child.updateMatrixWorld(true);
            const pos = child.geometry.attributes.position;

            for (let i = 0; i < pos.count; i += SAMPLE_STEP) {
                v.fromBufferAttribute(pos, i);
                v.applyMatrix4(child.matrixWorld);
                rawPoints.push([v.x, v.y]);
            }
        });

        if (rawPoints.length === 0) return;

        // =========================================
        // STEP 2: GRID-BASED DEDUP
        // ↓ Was O(n²) linear scan — slow and inconsistent
        // =========================================
        const CELL_SIZE = 0.5;
        const gridMap = new Map();

        rawPoints.forEach(([x, y]) => {
            const key = `${Math.floor(x / CELL_SIZE)},${Math.floor(y / CELL_SIZE)}`;
            if (!gridMap.has(key)) gridMap.set(key, [x, y]);
        });

        // const filtered = Array.from(gridMap.values());
        // STEP 2.5: REMOVE ISOLATED POINTS (internal geometry noise)
        const deduped = Array.from(gridMap.values());
        const NEIGHBOUR_RADIUS = 0.8;
        const MIN_NEIGHBOURS = 2;

        const filtered = deduped.filter(([x, y]) => {
            let count = 0;
            for (let j = 0; j < deduped.length; j++) {
                const dx = x - deduped[j][0];
                const dy = y - deduped[j][1];
                if (Math.sqrt(dx * dx + dy * dy) < NEIGHBOUR_RADIUS) {
                    if (++count >= MIN_NEIGHBOURS) return true;
                }
            }
            return false;
        });

        // =========================================
        // STEP 3: SAFETY CAP — preserve spread
        // =========================================
        const MAX_POINTS = 4000;
        const safePoints = filtered.length > MAX_POINTS
            ? filtered.filter((_, i) => i % Math.ceil(filtered.length / MAX_POINTS) === 0)
            : filtered;

        // =========================================
        // STEP 4: TIGHTER CONCAVE HULL
        // ↓ Was 3 — too loose, missing arms/ladder
        // =========================================
        const concave = concaveman(safePoints, 2);
        // =========================================
        // STEP 4.5: MERGE CLOSE HULL POINTS ✅ NEW
        // Collapses clustered hull points into midpoints
        // without loosening the overall shape
        // =========================================
        const MERGE_DISTANCE = 0.8;
        const mergedConcave = [];

        for (let i = 0; i < concave.length; i++) {
            const curr = concave[i];
            const prev = mergedConcave[mergedConcave.length - 1];

            if (!prev) {
                mergedConcave.push(curr);
                continue;
            }

            const dx = curr[0] - prev[0];
            const dy = curr[1] - prev[1];
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < MERGE_DISTANCE) {
                // Replace last point with midpoint
                mergedConcave[mergedConcave.length - 1] = [
                    (curr[0] + prev[0]) / 2,
                    (curr[1] + prev[1]) / 2,
                ];
            } else {
                mergedConcave.push(curr);
            }
        }

        // =========================================
        // STEP 5: GENTLER SIMPLIFICATION
        // ↓ Was 0.5 — too aggressive, losing shape detail
        // =========================================
        const simplified = simplify(
            concave.map(([x, y]) => ({ x, y })),
            0.3,
            true
        );

        // =========================================
        // STEP 6: TRUE OUTWARD OFFSET via edge normals
        // ↓ Was scale * 1.05 — distorts non-centered shapes
        // =========================================
        const OFFSET = 0.2;
        const n = simplified.length;

        const polygon = simplified.map((p, i) => {
            const prev = simplified[(i - 1 + n) % n];
            const next = simplified[(i + 1) % n];

            const ax = p.x - prev.x, ay = p.y - prev.y;
            const bx = next.x - p.x, by = next.y - p.y;

            const na = { x: -ay, y: ax };
            const nb = { x: -by, y: bx };

            const lenA = Math.hypot(na.x, na.y) || 1;
            const lenB = Math.hypot(nb.x, nb.y) || 1;

            const nx = (na.x / lenA + nb.x / lenB);
            const ny = (na.y / lenA + nb.y / lenB);
            const len = Math.hypot(nx, ny) || 1;

            return {
                id: i + 1,
                x: p.x + (nx / len) * OFFSET,
                y: p.y + (ny / len) * OFFSET,
            };
        });

        // =========================================
        // STEP 7: SEGMENTS
        // =========================================
        const segments = polygon.map((p, i) => {
            const next = polygon[(i + 1) % polygon.length];
            return {
                id: `${p.id}-${next.id}`,
                start: p.id,
                end: next.id,
                type: "line",
            };
        });
        const allIds = polygon.map((p) => p.id);

        set({ points: polygon, segments, closed: true, selectedSegment: null, });
    },
    // In your store, add this helper to cache vertices
    cacheModelVertices: (model) => {
        if (!model) return;
        model.updateMatrixWorld(true);

        const v = new THREE.Vector3();
        const vertices = [];

        model.traverse((child) => {
            if (!child.isMesh || !child.geometry?.attributes?.position) return;
            child.updateMatrixWorld(true);
            const pos = child.geometry.attributes.position;

            // Sample every 5th vertex — enough for accurate distance
            for (let i = 0; i < pos.count; i += 5) {
                v.fromBufferAttribute(pos, i);
                v.applyMatrix4(child.matrixWorld);
                vertices.push([v.x, v.y]); // store flat XY
            }
        });

        set({ cachedVertices: vertices });
    },
    toggleMeasurementPoint: (id) => set((state) => ({
        measurementPointIds: state.measurementPointIds.includes(id)
            ? state.measurementPointIds.filter((pid) => pid !== id)
            : [...state.measurementPointIds, id],
    })),
    generateFootprint: (model) => {
        if (!model) return;

        const SAMPLE_STEP = 5;
        const CELL_SIZE = 0.2;

        const heightMap = new Map();
        const v = new THREE.Vector3();

        model.updateMatrixWorld(true);

        // ✅ STEP 0: AUTO-DETECT HEIGHT AXIS (rotation safe)
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);

        let heightAxis = "z";
        if (size.y > size.x && size.y > size.z) heightAxis = "y";
        else if (size.x > size.y && size.x > size.z) heightAxis = "x";

        console.log("📐 Height Axis:", heightAxis);

        // ✅ STEP 1: SAMPLE ONLY TOP SURFACE
        model.traverse((child) => {
            if (!child.isMesh || !child.geometry?.attributes?.position) return;

            child.updateMatrixWorld(true);

            const pos = child.geometry.attributes.position;

            // ✅ compute ONCE per mesh (not per vertex)
            child.geometry.computeVertexNormals();

            const normal = new THREE.Vector3(); // reuse object

            for (let i = 0; i < pos.count; i += SAMPLE_STEP) {
                v.fromBufferAttribute(pos, i);
                v.applyMatrix4(child.matrixWorld);

                normal.fromBufferAttribute(child.geometry.attributes.normal, i);

                const upComponent =
                    heightAxis === "x" ? normal.x :
                        heightAxis === "y" ? normal.y :
                            normal.z;

                if (upComponent < 0.6) continue;

                const key = `${Math.floor(v.x / CELL_SIZE)},${Math.floor(v.y / CELL_SIZE)}`;

                const currentHeight =
                    heightAxis === "x" ? v.x :
                        heightAxis === "y" ? v.y :
                            v.z;

                if (!heightMap.has(key) || heightMap.get(key).h < currentHeight) {
                    heightMap.set(key, {
                        x: v.x,
                        y: v.y,
                        h: currentHeight,
                    });
                }
            }
        });

        const rawPoints = Array.from(heightMap.values()).map(p => [p.x, p.y]);

        console.log("✅ Raw Points:", rawPoints.length);

        if (rawPoints.length === 0) return;

        // ✅ STEP 2: DEDUP GRID
        const gridMap = new Map();
        rawPoints.forEach(([x, y]) => {
            const key = `${Math.floor(x / CELL_SIZE)},${Math.floor(y / CELL_SIZE)}`;
            if (!gridMap.has(key)) gridMap.set(key, [x, y]);
        });

        const filtered = Array.from(gridMap.values());

        // ✅ STEP 3: LIMIT POINTS
        const MAX_POINTS = 4000;
        const safePoints =
            filtered.length > MAX_POINTS
                ? filtered.filter((_, i) => i % Math.ceil(filtered.length / MAX_POINTS) === 0)
                : filtered;

        // ✅ STEP 4: CONCAVE HULL
        const concave = concaveman(safePoints, 1.5);

        // ✅ STEP 5: MERGE CLOSE POINTS
        const MERGE_DISTANCE = 0.3;
        const merged = [];

        for (let i = 0; i < concave.length; i++) {
            const curr = concave[i];
            const prev = merged[merged.length - 1];

            if (!prev) {
                merged.push(curr);
                continue;
            }

            const dx = curr[0] - prev[0];
            const dy = curr[1] - prev[1];

            if (Math.sqrt(dx * dx + dy * dy) < MERGE_DISTANCE) {
                merged[merged.length - 1] = [
                    (curr[0] + prev[0]) / 2,
                    (curr[1] + prev[1]) / 2,
                ];
            } else {
                merged.push(curr);
            }
        }

        // ✅ STEP 6: SIMPLIFY
        const simplified = simplify(
            merged.map(([x, y]) => ({ x, y })),
            0.15,
            true
        );

        // ✅ STEP 7: OFFSET OUTWARD
        const VISUAL_OFFSET = 0.4;
        const n = simplified.length;

        const footprintPoints = simplified.map((p, i) => {
            const prev = simplified[(i - 1 + n) % n];
            const next = simplified[(i + 1) % n];

            const ax = p.x - prev.x;
            const ay = p.y - prev.y;

            const bx = next.x - p.x;
            const by = next.y - p.y;

            const na = { x: -ay, y: ax };
            const nb = { x: -by, y: bx };

            const lenA = Math.hypot(na.x, na.y) || 1;
            const lenB = Math.hypot(nb.x, nb.y) || 1;

            const nx = (na.x / lenA + nb.x / lenB);
            const ny = (na.y / lenA + nb.y / lenB);

            const len = Math.hypot(nx, ny) || 1;

            return {
                id: i + 1,
                x: p.x + (nx / len) * VISUAL_OFFSET,
                y: p.y + (ny / len) * VISUAL_OFFSET,
            };
        });

        const footprintSegments = footprintPoints.map((p, i) => {
            const next = footprintPoints[(i + 1) % footprintPoints.length];
            return {
                id: `${p.id}-${next.id}`,
                start: p.id,
                end: next.id,
                type: "line",
            };
        });

        // ✅ FINAL SET
        set({
            points: footprintPoints,
            segments: footprintSegments,
            closed: true,
            selectedSegment: null,
            footprintPoints,
            footprintSegments,
            safeZonePoints: [],
            safeZoneSegments: [],
            showSafeZone: false,
            measurementPointIds: [],
        });
    },

    // Generate 1500mm offset FROM the footprint
    generateSafeZone: () => {
        const { footprintPoints } = get();
        if (!footprintPoints.length) return;

        const OFFSET = 1.5; // 1500mm
        const n = footprintPoints.length;

        const safeZonePoints = footprintPoints.map((p, i) => {
            const prev = footprintPoints[(i - 1 + n) % n];
            const next = footprintPoints[(i + 1) % n];

            const ax = p.x - prev.x, ay = p.y - prev.y;
            const bx = next.x - p.x, by = next.y - p.y;

            const na = { x: -ay, y: ax };
            const nb = { x: -by, y: bx };

            const lenA = Math.hypot(na.x, na.y) || 1;
            const lenB = Math.hypot(nb.x, nb.y) || 1;

            const nx = (na.x / lenA + nb.x / lenB);
            const ny = (na.y / lenA + nb.y / lenB);
            const len = Math.hypot(nx, ny) || 1;

            return {
                id: i + 1,
                x: p.x + (nx / len) * OFFSET,
                y: p.y + (ny / len) * OFFSET,
            };
        });

        const safeZoneSegments = safeZonePoints.map((p, i) => {
            const next = safeZonePoints[(i + 1) % safeZonePoints.length];
            return { id: `sz-${p.id}-${next.id}`, start: p.id, end: next.id, type: "line" };
        });

        const allIds = safeZonePoints.map((p) => p.id);

        set({
            safeZonePoints,
            safeZoneSegments,
            showSafeZone: true,
            measurementPointIds: allIds,
        });
    }
}));