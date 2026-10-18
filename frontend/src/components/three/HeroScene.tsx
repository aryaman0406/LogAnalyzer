import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import * as THREE from 'three'

// ── Individual glowing node ──────────────────────────────
function Node({ position, color, size = 0.08 }: { position: [number, number, number]; color: string; size?: number }) {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(t * 0.5 + position[0]) * 0.05
    }
  })

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.8}
        toneMapped={false}
      />
    </mesh>
  )
}

// ── Connection line between nodes ────────────────────────
function Connection({ start, end, opacity = 0.3 }: { start: [number, number, number]; end: [number, number, number]; opacity?: number }) {
  const lineObj = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setFromPoints([new THREE.Vector3(...start), new THREE.Vector3(...end)])
    const mat = new THREE.LineBasicMaterial({ color: 0x818cf8, transparent: true, opacity })
    return new THREE.Line(g, mat)
  }, [start, end, opacity])

  return <primitive object={lineObj} />
}

// ── Mouse-reactive camera rig ────────────────────────────
function CameraRig() {
  const { camera } = useThree()
  const mouse = useRef({ x: 0, y: 0 })

  useFrame((state) => {
    const pointer = state.pointer
    mouse.current.x += (pointer.x * 0.3 - mouse.current.x) * 0.05
    mouse.current.y += (pointer.y * 0.15 - mouse.current.y) * 0.05
    camera.position.x = mouse.current.x
    camera.position.y = mouse.current.y + 0.5
    camera.lookAt(0, 0, 0)
  })

  return null
}

// ── Network graph scene ──────────────────────────────────
function NetworkScene() {
  // Generate node positions in a sphere-like distribution
  const nodes = useMemo(() => {
    const pts: { pos: [number, number, number]; color: string; size: number }[] = []
    const colors = ['#818cf8', '#34d399', '#818cf8', '#f87171', '#818cf8', '#fbbf24']
    const rng = (seed: number) => {
      const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
      return x - Math.floor(x)
    }
    for (let i = 0; i < 40; i++) {
      const theta = rng(i) * Math.PI * 2
      const phi = Math.acos(2 * rng(i + 100) - 1)
      const r = 1.2 + rng(i + 200) * 0.8
      pts.push({
        pos: [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta) * 0.6,
          r * Math.cos(phi),
        ],
        color: colors[i % colors.length],
        size: 0.04 + rng(i + 300) * 0.06,
      })
    }
    return pts
  }, [])

  // Generate connections between nearby nodes
  const connections = useMemo(() => {
    const conns: { start: [number, number, number]; end: [number, number, number]; opacity: number }[] = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].pos[0] - nodes[j].pos[0]
        const dy = nodes[i].pos[1] - nodes[j].pos[1]
        const dz = nodes[i].pos[2] - nodes[j].pos[2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < 1.0) {
          conns.push({
            start: nodes[i].pos,
            end: nodes[j].pos,
            opacity: Math.max(0.08, 0.35 - dist * 0.25),
          })
        }
      }
    }
    return conns
  }, [nodes])

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[3, 3, 3]} intensity={0.5} color="#818cf8" />
      <pointLight position={[-3, -2, 2]} intensity={0.3} color="#34d399" />

      <Float speed={0.8} rotationIntensity={0.1} floatIntensity={0.2}>
        <group>
          {nodes.map((n, i) => (
            <Node key={i} position={n.pos} color={n.color} size={n.size} />
          ))}
          {connections.map((c, i) => (
            <Connection key={i} start={c.start} end={c.end} opacity={c.opacity} />
          ))}
        </group>
      </Float>

      <CameraRig />
    </>
  )
}

// ── Exported canvas (lazy-loaded) ────────────────────────
export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0.5, 3.5], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <NetworkScene />
    </Canvas>
  )
}
