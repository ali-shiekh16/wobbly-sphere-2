import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { useMemo, useRef } from 'react';
import { IcosahedronGeometry, Mesh, MeshStandardMaterial } from 'three';
import CustomShaderMaterial from 'three-custom-shader-material';
import vertexShader from '../vertex';
import { useGLTF, useTexture } from '@react-three/drei';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

interface SphereProps {
  audioData: {
    volume: number;
    bass: number;
    mid: number;
    treble: number;
    isPlaying: boolean;
  };
  position: [number, number, number];
  shouldReduceQuality: boolean;
  isMobile: boolean;
  folder: string;
}

const Sphere = ({
  audioData,
  position,
  shouldReduceQuality,
  isMobile,
  folder,
}: SphereProps) => {
  // @ts-ignore
  const materialRef = useRef<CustomShaderMaterial<MeshStandardMaterial>>(null);
  const meshRef = useRef<Mesh>(null);

  // Time progression tracking for pausing animation
  const timeProgression = useRef(0);
  const lastElapsedTime = useRef(0);

  // Additional smoothing for animation values
  const smoothedAudioValues = useRef({
    volume: 0,
    bass: 0,
    mid: 0,
    treble: 0,
  });

  // Smoothed rotation state
  const smoothedRotation = useRef({
    x: 0,
    y: 0,
  });

  const { materials } = useGLTF('/sphere-new.glb');
  const baseTexture = useTexture('/texture/base.png');

  const material = useMemo(
    () => materials['Carbon Fiber Electric Blue.002'].clone(),
    [materials]
  );

  const {
    speed,
    noiseStrength,
    displacementStrength,
    fractAmount,
    audioReactivity,
    bassMultiplier,
    midMultiplier,
    trebleMultiplier,
    volumeMultiplier,
    audioSmoothness,
  } = useControls(
    folder,
    {
      speed: { value: 18, min: 0, max: 20, step: 0.001 },
      noiseStrength: { value: 0.4, min: 0, max: 15, step: 0.001 },
      displacementStrength: { value: 0.6, min: 0, max: 1, step: 0.001 },
      fractAmount: { value: 2, min: 0, max: 10, step: 1 },
      audioReactivity: { value: 0.7, min: 0, max: 5, step: 0.1 },
      bassMultiplier: { value: 1, min: 0, max: 5, step: 0.1 },
      midMultiplier: { value: 1, min: 0, max: 5, step: 0.1 },
      trebleMultiplier: { value: 1, min: 0, max: 5, step: 0.1 },
      volumeMultiplier: { value: 1, min: 0, max: 5, step: 0.1 },
      audioSmoothness: { value: 0.95, min: 0, max: 0.99, step: 0.01 },
    },
    { collapsed: true }
  );

  const geometry = useMemo(() => {
    const subdivisions = shouldReduceQuality
      ? isMobile
        ? 64
        : 80
      : isMobile
      ? 100
      : 120;

    const geom = mergeVertices(new IcosahedronGeometry(1, subdivisions));
    geom.computeTangents();
    return geom;
  }, [shouldReduceQuality, isMobile]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uNoiseStrength: { value: noiseStrength },
      uDisplacementStrength: { value: displacementStrength },
      uFractAmount: { value: fractAmount },
      uBaseTexture: { value: baseTexture },
      uAudioVolume: { value: 0 },
      uAudioBass: { value: 0 },
      uAudioMid: { value: 0 },
      uAudioTreble: { value: 0 },
      uAudioReactivity: { value: audioReactivity },
    }),
    [
      baseTexture,
      speed,
      noiseStrength,
      displacementStrength,
      fractAmount,
      audioReactivity,
    ]
  );

  const frameSkip = useRef(0);
  const FRAME_SKIP_COUNT = isMobile ? 1 : 0;

  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();
    const hasAudio = audioData.isPlaying && audioData.volume > 0.01;

    if (FRAME_SKIP_COUNT > 0) {
      frameSkip.current = (frameSkip.current + 1) % (FRAME_SKIP_COUNT + 1);
      if (frameSkip.current !== 0) return;
    }

    const rawAudioVolume = audioData.volume * volumeMultiplier;
    const rawAudioBass = audioData.bass * bassMultiplier;
    const rawAudioMid = audioData.mid * midMultiplier;
    const rawAudioTreble = audioData.treble * trebleMultiplier;

    const smoothing = audioSmoothness;

    if (!hasAudio) {
      const fadeOutSpeed = 0.95;
      smoothedAudioValues.current.volume *= fadeOutSpeed;
      smoothedAudioValues.current.bass *= fadeOutSpeed;
      smoothedAudioValues.current.mid *= fadeOutSpeed;
      smoothedAudioValues.current.treble *= fadeOutSpeed;
    } else {
      smoothedAudioValues.current.volume =
        smoothedAudioValues.current.volume * smoothing +
        rawAudioVolume * (1 - smoothing);
      smoothedAudioValues.current.bass =
        smoothedAudioValues.current.bass * smoothing +
        rawAudioBass * (1 - smoothing);
      smoothedAudioValues.current.mid =
        smoothedAudioValues.current.mid * smoothing +
        rawAudioMid * (1 - smoothing);
      smoothedAudioValues.current.treble =
        smoothedAudioValues.current.treble * smoothing +
        rawAudioTreble * (1 - smoothing);
    }

    const audioVolume = smoothedAudioValues.current.volume;
    const audioBass = smoothedAudioValues.current.bass;
    const audioMid = smoothedAudioValues.current.mid;
    const audioTreble = smoothedAudioValues.current.treble;

    const reactiveDisplacement =
      displacementStrength + audioVolume * audioReactivity * 0.3;
    const reactiveNoise = noiseStrength + audioBass * audioReactivity * 0.5;
    const reactiveSpeed = speed + audioTreble * audioReactivity * 2;

    if (hasAudio) {
      const deltaTime = elapsedTime - lastElapsedTime.current;
      timeProgression.current += deltaTime;
    }
    lastElapsedTime.current = elapsedTime;

    if (materialRef.current) {
      const material = materialRef.current;
      material.uniforms.uTime.value = timeProgression.current;
      material.uniforms.uSpeed.value = reactiveSpeed;
      material.uniforms.uNoiseStrength.value = reactiveNoise;
      material.uniforms.uDisplacementStrength.value = reactiveDisplacement;
      material.uniforms.uFractAmount.value = fractAmount;
      material.uniforms.uAudioVolume.value = audioVolume;
      material.uniforms.uAudioBass.value = audioBass;
      material.uniforms.uAudioMid.value = audioMid;
      material.uniforms.uAudioTreble.value = audioTreble;
      material.uniforms.uAudioReactivity.value = audioReactivity;
    }

    if (meshRef.current) {
      const baseRotation = hasAudio ? elapsedTime * 0.3 : 0;
      const targetAudioRotationBoost = audioMid * audioReactivity * 0.1;

      if (!hasAudio) {
        const rotationFadeOut = 0.98;
        smoothedRotation.current.x *= rotationFadeOut;
        smoothedRotation.current.y *= rotationFadeOut;
      } else {
        const rotationSmoothness = 0.95;
        smoothedRotation.current.x =
          smoothedRotation.current.x * rotationSmoothness +
          targetAudioRotationBoost * (1 - rotationSmoothness);
        smoothedRotation.current.y =
          smoothedRotation.current.y * rotationSmoothness +
          targetAudioRotationBoost * (1 - rotationSmoothness);
      }

      const mesh = meshRef.current;
      mesh.rotation.y = baseRotation + smoothedRotation.current.y;
      mesh.rotation.x = baseRotation + smoothedRotation.current.x;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      frustumCulled={false}
      position={position}
    >
      <CustomShaderMaterial
        ref={materialRef}
        baseMaterial={material}
        vertexShader={vertexShader}
        uniforms={uniforms}
      />
    </mesh>
  );
};

export default Sphere;
