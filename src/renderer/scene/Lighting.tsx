import { useCallback, useRef } from 'react'
import { useFrame, extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'
import type {
  AmbientLight,
  DirectionalLight,
  MeshStandardMaterial,
  PointLight,
  ShaderMaterial,
} from 'three'
import { Color, FogExp2, MathUtils, Object3D, Vector3, BackSide } from 'three'
import { StarField } from './effects/StarField'
import { CelestialGlow } from './effects/CelestialGlow'
import { getWindowGlassMaterials } from './window-glass-registry'
import {
  SKY_ZENITH_DAY,
  SKY_ZENITH_NIGHT,
  SKY_HORIZON_DAY,
  SKY_HORIZON_NIGHT,
  SKY_HORIZON_GOLDEN,
  SKY_GROUND_DAY,
  SKY_GROUND_NIGHT,
  SUN_GLOW_COLOR,
  FOG_DAY_COLOR,
  FOG_GOLDEN_COLOR,
  FOG_NIGHT_COLOR,
  FOG_DENSITY_DAY,
  FOG_DENSITY_NIGHT,
  WINDOW_DAY_COLOR,
  WINDOW_DAY_EMISSIVE,
  WINDOW_NIGHT_COLOR,
  WINDOW_NIGHT_EMISSIVE,
  WINDOW_DAY_EMISSIVE_INTENSITY,
  WINDOW_NIGHT_EMISSIVE_INTENSITY,
  computeGoldenHourFactor,
} from './sky-gradient'

const DAY_DURATION_SECONDS = 8 * 60
const CELESTIAL_ORBIT_RADIUS_X = 24
const CELESTIAL_ORBIT_RADIUS_Y = 13
const CELESTIAL_ORBIT_CENTER_Y = 5
const CELESTIAL_ORBIT_CENTER_Z = -18

// Reusable Color objects for per-frame lerp (avoids allocations)
const _zenith = new Color()
const _horizon = new Color()
const _ground = new Color()
const _fogColor = new Color()
const _windowColor = new Color()
const _windowEmissive = new Color()
const _sunDir = new Vector3()

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function resolveCelestialState(elapsedSeconds: number) {
  const phase = (elapsedSeconds % DAY_DURATION_SECONDS) / DAY_DURATION_SECONDS
  const sunAngle = phase * Math.PI * 2 + Math.PI / 2
  const moonAngle = sunAngle + Math.PI
  const sunPosition: [number, number, number] = [
    Math.cos(sunAngle) * CELESTIAL_ORBIT_RADIUS_X,
    Math.sin(sunAngle) * CELESTIAL_ORBIT_RADIUS_Y + CELESTIAL_ORBIT_CENTER_Y,
    CELESTIAL_ORBIT_CENTER_Z + Math.sin(sunAngle) * 1.4,
  ]
  const moonPosition: [number, number, number] = [
    Math.cos(moonAngle) * CELESTIAL_ORBIT_RADIUS_X,
    Math.sin(moonAngle) * CELESTIAL_ORBIT_RADIUS_Y + CELESTIAL_ORBIT_CENTER_Y,
    CELESTIAL_ORBIT_CENTER_Z + Math.sin(moonAngle) * 1.4,
  ]
  const daylight = clamp01((sunPosition[1] + 1.2) / (CELESTIAL_ORBIT_RADIUS_Y + 1.2))
  const moonlight = clamp01((moonPosition[1] + 1.2) / (CELESTIAL_ORBIT_RADIUS_Y + 1.2))

  return { daylight, moonlight, sunPosition, moonPosition }
}

// --- Gradient Sky Shader Material ---

const GradientSkyMaterial = shaderMaterial(
  {
    uZenithColor: new Color('#4A90D9'),
    uHorizonColor: new Color('#B0D4F1'),
    uGroundColor: new Color('#8BA4B8'),
    uSunDirection: new Vector3(0, 1, 0),
    uSunGlowColor: new Color('#FFD080'),
    uSunGlowIntensity: 0.0,
  },
  `
    varying vec3 vWorldDir;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldDir = normalize(worldPos.xyz - cameraPosition);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  `
    uniform vec3 uZenithColor;
    uniform vec3 uHorizonColor;
    uniform vec3 uGroundColor;
    uniform vec3 uSunDirection;
    uniform vec3 uSunGlowColor;
    uniform float uSunGlowIntensity;
    varying vec3 vWorldDir;

    void main() {
      vec3 dir = normalize(vWorldDir);
      float y = dir.y;

      float upperBlend = smoothstep(0.0, 0.55, y);
      vec3 upper = mix(uHorizonColor, uZenithColor, upperBlend);

      float lowerBlend = smoothstep(-0.35, 0.0, y);
      vec3 lower = mix(uGroundColor, uHorizonColor, lowerBlend);

      vec3 skyColor = y >= 0.0 ? upper : lower;

      float sunDot = max(dot(dir, uSunDirection), 0.0);
      float glow = pow(sunDot, 8.0) * uSunGlowIntensity;
      skyColor += uSunGlowColor * glow;

      gl_FragColor = vec4(skyColor, 1.0);
    }
  `
)

extend({ GradientSkyMaterial })

declare module '@react-three/fiber' {
  interface ThreeElements {
    gradientSkyMaterial: ThreeElements['shaderMaterial']
  }
}

interface LightingProps {
  daylightRef: React.MutableRefObject<number>
}

export function Lighting({ daylightRef }: LightingProps) {
  const skyMaterialRef = useRef<ShaderMaterial>(null)
  const sunMaterialRef = useRef<MeshStandardMaterial>(null)
  const moonMaterialRef = useRef<MeshStandardMaterial>(null)
  const ambientLightRef = useRef<AmbientLight>(null)
  const sunLightRef = useRef<DirectionalLight>(null)
  const moonLightRef = useRef<DirectionalLight>(null)
  const indoorFillARef = useRef<PointLight>(null)
  const indoorFillBRef = useRef<PointLight>(null)
  const sunOrbRef = useRef<Object3D>(null)
  const moonOrbRef = useRef<Object3D>(null)
  const fogRef = useRef<FogExp2 | null>(null)

  useFrame(({ clock, scene: frameScene }) => {
    const t = clock.getElapsedTime()
    const { daylight, moonlight, sunPosition, moonPosition } = resolveCelestialState(t)
    daylightRef.current = daylight
    const golden = computeGoldenHourFactor(daylight)

    // Lazy fog initialization
    if (!fogRef.current) {
      fogRef.current = new FogExp2(FOG_DAY_COLOR.getHex(), FOG_DENSITY_DAY)
      frameScene.fog = fogRef.current
    }

    if (sunOrbRef.current) {
      sunOrbRef.current.position.set(sunPosition[0], sunPosition[1], sunPosition[2])
    }
    if (moonOrbRef.current) {
      moonOrbRef.current.position.set(moonPosition[0], moonPosition[1], moonPosition[2])
    }

    if (sunLightRef.current) {
      sunLightRef.current.position.set(sunPosition[0], sunPosition[1], sunPosition[2])
      sunLightRef.current.intensity = MathUtils.lerp(0.05, 1.2, daylight)
      sunLightRef.current.color.setRGB(
        MathUtils.lerp(0.55, 1, daylight),
        MathUtils.lerp(0.62, 0.98, daylight),
        MathUtils.lerp(0.74, 0.9, daylight)
      )
    }
    if (moonLightRef.current) {
      moonLightRef.current.position.set(moonPosition[0], moonPosition[1], moonPosition[2])
      moonLightRef.current.intensity = MathUtils.lerp(0.08, 0.5, moonlight)
    }

    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = MathUtils.lerp(0.28, 0.58, daylight)
      ambientLightRef.current.color.setRGB(
        MathUtils.lerp(0.22, 1, daylight),
        MathUtils.lerp(0.26, 0.98, daylight),
        MathUtils.lerp(0.52, 0.92, daylight)
      )
    }

    if (skyMaterialRef.current) {
      const mat = skyMaterialRef.current

      _zenith.copy(SKY_ZENITH_NIGHT).lerp(SKY_ZENITH_DAY, daylight)
      mat.uniforms.uZenithColor.value.copy(_zenith)

      _horizon.copy(SKY_HORIZON_NIGHT).lerp(SKY_HORIZON_DAY, daylight)
      if (golden > 0) {
        _horizon.lerp(SKY_HORIZON_GOLDEN, golden * 0.7)
      }
      mat.uniforms.uHorizonColor.value.copy(_horizon)

      _ground.copy(SKY_GROUND_NIGHT).lerp(SKY_GROUND_DAY, daylight)
      mat.uniforms.uGroundColor.value.copy(_ground)

      frameScene.background = _horizon

      _sunDir.set(sunPosition[0], sunPosition[1], sunPosition[2]).normalize()
      mat.uniforms.uSunDirection.value.copy(_sunDir)
      mat.uniforms.uSunGlowIntensity.value = daylight * 0.6 + golden * 0.4
      mat.uniforms.uSunGlowColor.value.copy(SUN_GLOW_COLOR)
    }

    if (sunMaterialRef.current) {
      sunMaterialRef.current.emissiveIntensity = MathUtils.lerp(0.22, 1.35, daylight)
    }
    if (moonMaterialRef.current) {
      moonMaterialRef.current.emissiveIntensity = MathUtils.lerp(0.06, 0.7, moonlight)
    }

    if (indoorFillARef.current) indoorFillARef.current.intensity = MathUtils.lerp(0.6, 0.18, daylight)
    if (indoorFillBRef.current) indoorFillBRef.current.intensity = MathUtils.lerp(0.55, 0.18, daylight)

    if (fogRef.current) {
      fogRef.current.density = MathUtils.lerp(FOG_DENSITY_NIGHT, FOG_DENSITY_DAY, daylight)
      _fogColor.copy(FOG_NIGHT_COLOR).lerp(FOG_DAY_COLOR, daylight)
      if (golden > 0) {
        _fogColor.lerp(FOG_GOLDEN_COLOR, golden * 0.5)
      }
      fogRef.current.color.copy(_fogColor)
    }

    const windowMats = getWindowGlassMaterials()
    if (windowMats.length > 0) {
      _windowColor.copy(WINDOW_NIGHT_COLOR).lerp(WINDOW_DAY_COLOR, daylight)
      _windowEmissive.copy(WINDOW_NIGHT_EMISSIVE).lerp(WINDOW_DAY_EMISSIVE, daylight)
      let emissiveIntensity = MathUtils.lerp(
        WINDOW_NIGHT_EMISSIVE_INTENSITY,
        WINDOW_DAY_EMISSIVE_INTENSITY,
        daylight
      )
      if (daylight < 0.3) {
        emissiveIntensity += Math.sin(t * 3.5) * 0.08 * (1 - daylight / 0.3)
      }
      for (const mat of windowMats) {
        mat.color.copy(_windowColor)
        mat.emissive.copy(_windowEmissive)
        mat.emissiveIntensity = emissiveIntensity
      }
    }
  })

  const sunVisibilityFn = useCallback(() => daylightRef.current ?? 1, [daylightRef])
  const moonVisibilityFn = useCallback(() => 1 - (daylightRef.current ?? 1), [daylightRef])

  return (
    <>
      {/* Gradient sky dome */}
      <mesh>
        <sphereGeometry args={[85, 48, 24]} />
        <gradientSkyMaterial ref={skyMaterialRef} side={BackSide} />
      </mesh>

      <StarField daylightRef={daylightRef} />

      {/* Sun orb + glow */}
      <mesh ref={sunOrbRef} position={[0, 10, CELESTIAL_ORBIT_CENTER_Z]}>
        <sphereGeometry args={[0.95, 48, 32]} />
        <meshStandardMaterial
          ref={sunMaterialRef}
          color="#FDE68A"
          emissive="#FDBA74"
          emissiveIntensity={1}
        />
      </mesh>
      <CelestialGlow
        targetRef={sunOrbRef}
        color="#FFD080"
        visibilityFn={sunVisibilityFn}
        outerScale={4.5}
        innerScale={2.2}
      />

      {/* Moon orb + glow */}
      <mesh ref={moonOrbRef} position={[0, -8, CELESTIAL_ORBIT_CENTER_Z]}>
        <sphereGeometry args={[0.72, 48, 32]} />
        <meshStandardMaterial
          ref={moonMaterialRef}
          color="#E2E8F0"
          emissive="#93C5FD"
          emissiveIntensity={0.2}
        />
      </mesh>
      <CelestialGlow
        targetRef={moonOrbRef}
        color="#8AB4E8"
        visibilityFn={moonVisibilityFn}
        outerScale={3.0}
        innerScale={1.5}
      />

      <ambientLight ref={ambientLightRef} intensity={0.52} />
      <directionalLight
        ref={sunLightRef}
        position={[5, 8, 5]}
        intensity={1.05}
        color="#EFF6FF"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight
        ref={moonLightRef}
        position={[-8, 10, -12]}
        intensity={0.2}
        color="#93C5FD"
      />

      <pointLight ref={indoorFillARef} position={[-4, 3, -4]} intensity={0.3} color="#FFE4B5" />
      <pointLight ref={indoorFillBRef} position={[4, 3, -9]} intensity={0.3} color="#FFE4B5" />
    </>
  )
}
