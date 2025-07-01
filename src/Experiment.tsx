import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { useGLTF, useTexture } from '@react-three/drei';
import {
  MeshDepthMaterial,
  RGBADepthPacking,
  Mesh,
  IcosahedronGeometry,
} from 'three';
import CustomShaderMaterial from 'three-custom-shader-material';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import vertexShader from '../vertex';

interface ExperimentProps {
  shouldReduceQuality: boolean;
  isMobile: boolean;
  onLoaded: () => void;
  audioData: {
    volume: number;
    bass: number;
    mid: number;
    treble: number;
    isPlaying: boolean;
  };
}

const Experiment = ({
  shouldReduceQuality,
  isMobile,
  onLoaded,
  audioData,
}: ExperimentProps) => {
  const materialRef = useRef<any>(null);
  const depthMaterialRef = useRef<any>(null);
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

  // Load assets
  const { materials } = useGLTF('/sphere-new.glb');
  const baseTexture = useTexture('/texture/base.png');

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
  } = useControls({
    speed: {
      value: 18,
      min: 0,
      max: 20,
      step: 0.001,
    },
    noiseStrength: {
      value: 0.4,
      min: 0,
      max: 15,
      step: 0.001,
    },
    displacementStrength: {
      value: 0.6,
      min: 0,
      max: 1,
      step: 0.001,
    },
    fractAmount: {
      value: 2,
      min: 0,
      max: 10,
      step: 1,
    },
    audioReactivity: {
      value: 0.7,
      min: 0,
      max: 5,
      step: 0.1,
    },
    bassMultiplier: {
      value: 1.1,
      min: 0,
      max: 3,
      step: 0.1,
    },
    midMultiplier: {
      value: 1.3,
      min: 0,
      max: 3,
      step: 0.1,
    },
    trebleMultiplier: {
      value: 0.8,
      min: 0,
      max: 3,
      step: 0.1,
    },
    volumeMultiplier: {
      value: 1.2,
      min: 0,
      max: 3,
      step: 0.1,
    },
    audioSmoothness: {
      value: 0.95,
      min: 0.5,
      max: 0.99,
      step: 0.01,
    },
  });

  const { intensity: ambientLightIntensity, color: ambientLightColor } =
    useControls('Ambient light', {
      color: '#fff',
      intensity: {
        value: 1,
        min: 0,
        max: 1,
        step: 0.001,
      },
    });

  const {
    intensity: directionalLightIntensity,
    color: directionalLightColor,
    positionX: directionalLightPositionX,
    positionY: directionalLightPositionY,
    positionZ: directionalLightPositionZ,
  } = useControls('Directional light', {
    color: '#fff',
    intensity: {
      value: 5,
      min: 0,
      max: 5,
      step: 0.001,
    },
    positionX: {
      value: -2,
      min: -10,
      max: 10,
      step: 0.001,
    },
    positionY: {
      value: 2,
      min: -10,
      max: 10,
      step: 0.001,
    },
    positionZ: {
      value: 3.5,
      min: -10,
      max: 10,
      step: 0.001,
    },
  });

  // Optimized geometry based on device capabilities
  const geometry = useMemo(() => {
    // Reduce geometry complexity on mobile and low-end devices
    const subdivisions = shouldReduceQuality
      ? isMobile
        ? 64
        : 80 // Lower subdivision for mobile
      : isMobile
      ? 100
      : 120; // High quality but still mobile-optimized

    const geometry = mergeVertices(new IcosahedronGeometry(1, subdivisions));
    geometry.computeTangents();
    return geometry;
  }, [shouldReduceQuality, isMobile]);

  // Memoized uniforms object to prevent recreation on every render
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uNoiseStrength: { value: noiseStrength },
      uDisplacementStrength: { value: displacementStrength },
      uFractAmount: { value: fractAmount },
      uBaseTexture: { value: baseTexture },
      // Audio reactive uniforms
      uAudioVolume: { value: 0 },
      uAudioBass: { value: 0 },
      uAudioMid: { value: 0 },
      uAudioTreble: { value: 0 },
      uAudioReactivity: { value: audioReactivity },
    }),
    [baseTexture]
  ); // Only recreate when texture changes

  useEffect(() => {
    onLoaded();
  }, [onLoaded]);

  // Optimized frame rate limiting for better performance
  const frameSkip = useRef(0);
  const FRAME_SKIP_COUNT = isMobile ? 1 : 0; // Skip every other frame on mobile

  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();

    // Check if audio is playing and has sufficient volume
    const hasAudio = audioData.isPlaying && audioData.volume > 0.01; // Threshold for silence

    // Frame rate optimization - skip frames on mobile devices
    if (FRAME_SKIP_COUNT > 0) {
      frameSkip.current = (frameSkip.current + 1) % (FRAME_SKIP_COUNT + 1);
      if (frameSkip.current !== 0) return;
    }

    // Calculate raw audio-reactive values
    const rawAudioVolume = audioData.volume * volumeMultiplier;
    const rawAudioBass = audioData.bass * bassMultiplier;
    const rawAudioMid = audioData.mid * midMultiplier;
    const rawAudioTreble = audioData.treble * trebleMultiplier;

    // Apply additional smoothing for animation
    const smoothing = audioSmoothness;

    // If no audio, gradually reduce smoothed values to zero
    if (!hasAudio) {
      const fadeOutSpeed = 0.95; // How quickly animation fades out when audio stops
      smoothedAudioValues.current.volume *= fadeOutSpeed;
      smoothedAudioValues.current.bass *= fadeOutSpeed;
      smoothedAudioValues.current.mid *= fadeOutSpeed;
      smoothedAudioValues.current.treble *= fadeOutSpeed;
    } else {
      // Normal smoothing when audio is present
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

    // Use smoothed values for animation
    const audioVolume = smoothedAudioValues.current.volume;
    const audioBass = smoothedAudioValues.current.bass;
    const audioMid = smoothedAudioValues.current.mid;
    const audioTreble = smoothedAudioValues.current.treble;

    // Apply audio reactivity to displacement and noise
    const reactiveDisplacement =
      displacementStrength + audioVolume * audioReactivity * 0.3;
    const reactiveNoise = noiseStrength + audioBass * audioReactivity * 0.5;
    const reactiveSpeed = speed + audioTreble * audioReactivity * 2;

    // Track time progression - pause when no audio
    if (hasAudio) {
      // Continue time progression when audio is playing
      const deltaTime = elapsedTime - lastElapsedTime.current;
      timeProgression.current += deltaTime;
    }
    lastElapsedTime.current = elapsedTime;

    // Batch uniform updates for better performance
    if (materialRef.current) {
      const material = materialRef.current;
      material.uniforms.uTime.value = timeProgression.current;
      material.uniforms.uSpeed.value = reactiveSpeed;
      material.uniforms.uNoiseStrength.value = reactiveNoise;
      material.uniforms.uDisplacementStrength.value = reactiveDisplacement;
      material.uniforms.uFractAmount.value = fractAmount;

      // Update audio uniforms
      material.uniforms.uAudioVolume.value = audioVolume;
      material.uniforms.uAudioBass.value = audioBass;
      material.uniforms.uAudioMid.value = audioMid;
      material.uniforms.uAudioTreble.value = audioTreble;
      material.uniforms.uAudioReactivity.value = audioReactivity;
    }

    if (depthMaterialRef.current) {
      const depthMaterial = depthMaterialRef.current;
      depthMaterial.uniforms.uTime.value = timeProgression.current;
      depthMaterial.uniforms.uSpeed.value = reactiveSpeed;
      depthMaterial.uniforms.uNoiseStrength.value = reactiveNoise;
      depthMaterial.uniforms.uDisplacementStrength.value = reactiveDisplacement;
      depthMaterial.uniforms.uFractAmount.value = fractAmount;
    }

    if (meshRef.current) {
      // Add subtle audio-reactive rotation with smooth interpolation
      const baseRotation = hasAudio ? elapsedTime * 0.3 : 0; // Stop base rotation when no audio
      const targetAudioRotationBoost = audioMid * audioReactivity * 0.1;

      if (!hasAudio) {
        // Gradually stop rotation when no audio
        const rotationFadeOut = 0.98;
        smoothedRotation.current.x *= rotationFadeOut;
        smoothedRotation.current.y *= rotationFadeOut;
      } else {
        // Normal rotation smoothing when audio is present
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
    <>
      <mesh
        ref={meshRef}
        geometry={geometry}
        frustumCulled={false} // Disable frustum culling for always-visible sphere
        position={[0, isMobile ? -1.3 * 0 : 0, 0]}
      >
        <CustomShaderMaterial
          ref={materialRef}
          baseMaterial={materials['Carbon Fiber Electric Blue.002']}
          vertexShader={vertexShader}
          uniforms={uniforms}
        />
        <CustomShaderMaterial
          ref={depthMaterialRef}
          baseMaterial={MeshDepthMaterial}
          vertexShader={vertexShader}
          uniforms={uniforms}
          depthPacking={RGBADepthPacking}
          attach='customDepthMaterial'
        />
      </mesh>
      <ambientLight
        color={ambientLightColor}
        intensity={ambientLightIntensity}
      />
      <directionalLight
        color={directionalLightColor}
        intensity={directionalLightIntensity}
        position={[
          directionalLightPositionX,
          directionalLightPositionY,
          directionalLightPositionZ,
        ]}
        castShadow={false} // Disable shadows for better performance
      />
    </>
  );
};

export default Experiment;
