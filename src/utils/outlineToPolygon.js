export function outlineToPolygon(outlinePoints) {
    if (!outlinePoints?.length) {
        return {
            points: [],
            segments: [],
        };
    }

    // remove duplicated last point
    const clean = outlinePoints.slice(0, -1);

    // POINTS
    const points = clean.map((p, index) => ({
        id: index + 1,

        // THREE:
        // [x, y(height), z]

        x: p[0],
        y: p[2],
    }));

    // SEGMENTS
    const segments = points.map((p, index) => {
        const next =
            points[
            (index + 1) % points.length
            ];

        return {
            id: `${p.id}-${next.id}`,
            start: p.id,
            end: next.id,
            type: "line",
            safeOffset: 1.5,
            joinType: "round"
        };
    });

    return {
        points,
        segments,
    };
}