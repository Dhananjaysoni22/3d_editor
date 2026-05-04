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

    setModelBounds: (box) => set({ modelBounds: box }),

    setModel: (model) => set({ model }),

    convertToMesh: () => set({ isMesh: true }),
    selectPolygon: () => set({ selectedPolygon: true }),
    deselectPolygon: () => set({ selectedPolygon: false }),

    startPolygonDrag: () => set({ isDraggingPolygon: true }),
    stopPolygonDrag: () => set({ isDraggingPolygon: false }),

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
        const SAMPLE_STEP = 3;

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
        const CELL_SIZE = 0.15;
        const gridMap = new Map();

        rawPoints.forEach(([x, y]) => {
            const key = `${Math.floor(x / CELL_SIZE)},${Math.floor(y / CELL_SIZE)}`;
            if (!gridMap.has(key)) gridMap.set(key, [x, y]);
        });

        const filtered = Array.from(gridMap.values());

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
        const concave = concaveman(safePoints, 1.8);

        // =========================================
        // STEP 5: GENTLER SIMPLIFICATION
        // ↓ Was 0.5 — too aggressive, losing shape detail
        // =========================================
        const simplified = simplify(
            concave.map(([x, y]) => ({ x, y })),
            0.2,
            true
        );

        // =========================================
        // STEP 6: TRUE OUTWARD OFFSET via edge normals
        // ↓ Was scale * 1.05 — distorts non-centered shapes
        // =========================================
        const OFFSET = 1.5;
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
}));