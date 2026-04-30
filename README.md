# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# 🧩 Bezier Polygon Editor – Implementation Notes

This document explains everything we’ve built so far in your React Three Fiber polygon editor, including **what**, **why**, and **how each part works**. You can reuse this to explain your system or continue development later.

---

# 🚀 1. Overall Goal

We are building a system where:

- Users create a polygon by placing points
- Points connect via segments (lines)
- Any segment can be converted into a **Bezier curve**
- Curves can be adjusted using **control points**
- Entire shape updates dynamically

---

# 🧱 2. Core Data Structure (Zustand Store)

## 📌 Points

```js
points = [{ id, x, y }];
```

## 📌 Segments

```js
segments = [
  {
    id,
    start,   // point id
    end,     // point id
    type: "line" | "bezier",
    control1?, // for bezier
    control2?
  }
]
```

---

# ⚙️ 3. Key Functionalities

---

## 🔹 3.1 Convert Line → Curve

### 📍 Use Case

User clicks midpoint → line becomes curve

### ✅ Code

```js
convertToCurve: (segmentId) =>
  set((state) => ({
    segments: state.segments.map((s) => {
      if (s.id !== segmentId) return s;

      const p1 = state.points.find((p) => p.id === s.start);
      const p2 = state.points.find((p) => p.id === s.end);

      return {
        ...s,
        type: "bezier",
        control1: {
          x: (p1.x + p2.x) / 2,
          y: p1.y + 1,
        },
        control2: {
          x: (p1.x + p2.x) / 2,
          y: p2.y - 1,
        },
      };
    }),
  }));
```

### 💡 Why

We initialize control points with offsets so curve is visible immediately.

---

# 🎯 4. SegmentsLayer.jsx

## 📍 Responsibility

- Draw lines and curves
- Handle click interactions
- Convert lines to curves

---

## 🔹 Line Rendering

```js
const positions = useMemo(() => {
  return new Float32Array([p1.x, p1.y, 0, p2.x, p2.y, 0]);
}, [p1.x, p1.y, p2.x, p2.y]);
```

```jsx
<group key={`${seg.id}-${p1.x}-${p1.y}-${p2.x}-${p2.y}`}>
  <line>
    <bufferGeometry>
      <bufferAttribute array={positions} count={2} itemSize={3} />
    </bufferGeometry>
    <lineBasicMaterial color="white" />
  </line>
</group>
```

### 💡 Why

- `useMemo` ensures reactivity
- dynamic `key` forces re-render when points move

---

## 🔹 Bezier Curve Rendering

```js
const positions = useMemo(() => {
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(p1.x, p1.y, 0),
    new THREE.Vector3(seg.control1.x, seg.control1.y, 0),
    new THREE.Vector3(seg.control2.x, seg.control2.y, 0),
    new THREE.Vector3(p2.x, p2.y, 0),
  );

  const points = curve.getPoints(50);

  return new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]));
}, [
  p1.x,
  p1.y,
  p2.x,
  p2.y,
  seg.control1.x,
  seg.control1.y,
  seg.control2.x,
  seg.control2.y,
]);
```

```jsx
<line key={`curve-${seg.id}-${seg.control1.x}-${seg.control2.x}`}>
  <bufferGeometry>
    <bufferAttribute
      array={positions}
      count={positions.length / 3}
      itemSize={3}
    />
  </bufferGeometry>
  <lineBasicMaterial color="orange" />
</line>
```

### 💡 Why

- `useMemo` ensures smooth real-time updates
- dependency array triggers redraw
- fixes "curve not updating while dragging"

---

# 🎮 5. ControlPointsLayer.jsx

## 📍 Responsibility

- Show control handles
- Allow dragging
- Update curve shape

---

## 🔹 Real-time Dragging (Important)

```js
useFrame(() => {
  if (!dragging) return;

  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const point = new THREE.Vector3();

  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(plane, point);

  updateSegment(dragging.segId, {
    [dragging.type === "c1" ? "control1" : "control2"]: {
      x: point.x,
      y: point.y,
    },
  });
});
```

### 💡 Why

- `onPointerMove` is unreliable in R3F
- `useFrame` gives **smooth continuous updates**

---

## 🔹 Control Points UI

```jsx
<mesh
  position={[seg.control1.x, seg.control1.y, 0.1]}
  onPointerDown={(e) => {
    e.stopPropagation();
    setDragging({ segId: seg.id, type: "c1" });
  }}
>
  <circleGeometry args={[0.5, 16]} />
  <meshBasicMaterial color="hotpink" />
</mesh>
```

### 💡 Why

- Z offset avoids overlap issues
- pointerDown starts dragging state

---

## 🔹 Helper Lines

```js
const helper1 = useMemo(
  () => new Float32Array([p1.x, p1.y, 0, seg.control1.x, seg.control1.y, 0]),
  [p1.x, p1.y, seg.control1.x, seg.control1.y],
);
```

### 💡 Why

- Shows relationship between anchor and control
- improves UX (like Figma)

---

# 🧠 6. Fix: Polygon Breaking Issue

## ❌ Problem

Moving a vertex breaks curve

## ✅ Fix

```js
updatePoint: (id, newPos) =>
  set((state) => {
    const oldPoint = state.points.find((p) => p.id === id);

    const dx = newPos.x - oldPoint.x;
    const dy = newPos.y - oldPoint.y;

    return {
      points: state.points.map((p) =>
        p.id === id ? { ...p, ...newPos } : p
      ),

      segments: state.segments.map((seg) => {
        if (seg.type !== "bezier") return seg;

        if (seg.start === id || seg.end === id) {
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
        }

        return seg;
      }),
    };
  }),
```

### 💡 Why

- Keeps curve attached to moving point
- prevents shape breaking

---

# 🖼️ 7. CanvasContainer.jsx

```jsx
<Canvas orthographic camera={{ zoom: 50, position: [0, 0, 10] }}>
  <PointsLayer />
  <SegmentsLayer />
  <ControlPointsLayer />
  <InteractionManager />
</Canvas>
```

### 💡 Why

- orthographic = 2D drawing feel
- layers separated = clean architecture

---

# 🧩 8. Final System Behavior

### ✅ Working Features

- Draw polygon
- Convert line → curve
- Drag curve handles
- Move points without breaking shape
- Real-time updates

---

# 🔮 9. Possible Next Features

- Symmetric handles (like Figma)
- Snap to grid
- Smooth/Sharp toggle
- Drag entire segment
- Close/open path toggle

---

# 🎯 Summary

You now have a **mini vector editor engine**:

- State-driven geometry
- Reactive rendering
- Real-time interaction
- Stable curve system

This is the same core concept used in:
👉 Figma
👉 Illustrator
👉 CAD tools

---

If you share this doc later, I’ll instantly understand your system and help you extend it faster 🚀
