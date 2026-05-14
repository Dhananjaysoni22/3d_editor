import ClipperLib from "clipper-lib";

function chaikinSmooth(points, iterations = 1) {
    let pts = [...points];

    for (let k = 0; k < iterations; k++) {
        const newPts = [];

        for (let i = 0; i < pts.length; i++) {
            const p0 = pts[i];
            const p1 = pts[(i + 1) % pts.length];

            const q = {
                x: 0.75 * p0.x + 0.25 * p1.x,
                y: 0.75 * p0.y + 0.25 * p1.y,
            };

            const r = {
                x: 0.25 * p0.x + 0.75 * p1.x,
                y: 0.25 * p0.y + 0.75 * p1.y,
            };

            newPts.push(q, r);
        }

        pts = newPts;
    }

    return pts;
}

function simplifyPolygon(points, minDistance = 0.25) {
    if (!points.length) return [];

    const simplified = [points[0]];

    for (let i = 1; i < points.length; i++) {
        const prev = simplified[simplified.length - 1];
        const curr = points[i];

        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;

        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= minDistance) {
            simplified.push(curr);
        }
    }

    return simplified;
}

export function generateOffsetPolygon(
    points,
    offsetMeters = 1.5,
) {
    if (!points?.length) {
        return {
            points: [],
            segments: [],
        };
    }

    const SCALE = 1000;

    const clipperPath = points.map((p) => ({
        X: Math.round(p.x * SCALE),
        Y: Math.round(p.y * SCALE),
    }));

    const co = new ClipperLib.ClipperOffset();

    co.AddPath(
        clipperPath,
        ClipperLib.JoinType.jtRound,
        ClipperLib.EndType.etClosedPolygon,
    );

    const solution = new ClipperLib.Paths();

    co.Execute(solution, offsetMeters * SCALE);

    if (!solution.length) {
        return {
            points: [],
            segments: [],
        };
    }

    let offsetPoints = solution[0].map((p, index) => ({
        id: index + 1,
        x: p.X / SCALE,
        y: p.Y / SCALE,
    }));

    // SMOOTH LIGHTLY
    offsetPoints = chaikinSmooth(offsetPoints, 1);

    // REMOVE EXTRA POINTS
    offsetPoints = simplifyPolygon(
        offsetPoints,
        0.35,
    );

    // REBUILD IDS
    offsetPoints = offsetPoints.map((p, i) => ({
        id: i + 1,
        x: p.x,
        y: p.y,
    }));

    // SEGMENTS
    const segments = offsetPoints.map((p, index) => {
        const next =
            offsetPoints[
            (index + 1) % offsetPoints.length
            ];

        return {
            id: `${p.id}-${next.id}`,
            start: p.id,
            end: next.id,
            type: "line",
        };
    });

    return {
        points: offsetPoints,
        segments,
    };
}