import { create } from "zustand";

export const usePolygonStore = create((set, get) => ({
    points: [],
    segments: [],
    closed: false,
    selectedSegment: null,
    selectedPolygon: false,
    isDraggingPolygon: false,
    isMesh: false,
    model: null,

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
    }
}));