import ClipperLib from "clipper-lib";

function chaikinSmooth(points, iterations = 3) {
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

function resamplePoints(points, spacing = 0.15) {
    const result = [];

    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        const dist = Math.sqrt(dx * dx + dy * dy);

        const segments = Math.max(1, Math.floor(dist / spacing));

        for (let j = 0; j < segments; j++) {
            const t = j / segments;

            result.push({
                x: p1.x + dx * t,
                y: p1.y + dy * t,
            });
        }
    }

    return result;
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

    // -----------------------------------
    // SCALE FOR CLIPPER
    // -----------------------------------

    const SCALE = 1000;

    const clipperPath = points.map((p) => ({
        X: Math.round(p.x * SCALE),
        Y: Math.round(p.y * SCALE),
    }));

    // -----------------------------------
    // OFFSET
    // -----------------------------------

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

    // -----------------------------------
    // CONVERT BACK
    // -----------------------------------

    let offsetPoints = solution[0].map((p, index) => ({
        id: index + 1,
        x: p.X / SCALE,
        y: p.Y / SCALE,
    }));

    // -----------------------------------
    // SMOOTH
    // -----------------------------------

    offsetPoints = chaikinSmooth(offsetPoints, 3);

    // -----------------------------------
    // RESAMPLE
    // -----------------------------------

    offsetPoints = resamplePoints(offsetPoints, 0.12);

    // -----------------------------------
    // REBUILD IDS
    // -----------------------------------

    offsetPoints = offsetPoints.map((p, i) => ({
        id: i + 1,
        x: p.x,
        y: p.y,
    }));

    // -----------------------------------
    // SEGMENTS
    // -----------------------------------

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