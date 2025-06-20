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
}

const Experiment = ({
  shouldReduceQuality,
  isMobile,
  onLoaded,
}: ExperimentProps) => {
  const materialRef = useRef<any>(null);
  const depthMaterialRef = useRef<any>(null);
  const meshRef = useRef<Mesh>(null); // Load base texture
  const { materials } = useGLTF('/sphere.glb');

  const baseTexture = useTexture('/texture/base.png');

  const { speed, noiseStrength, displacementStrength, fractAmount } =
    useControls({
      speed: {
        value: 9,
        min: 0,
        max: 20,
        step: 0.001,
      },
      noiseStrength: {
        value: 0.5,
        min: 0,
        max: 15,
        step: 0.001,
      },
      displacementStrength: {
        value: 0.93,
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

  const geometry = useMemo(() => {
    const geometry = mergeVertices(
      // @ts-ignore
      // nodes.Sphere001.geometry
      new IcosahedronGeometry(1, 80)
    );
    geometry.computeTangents();
    return geometry;
  }, [shouldReduceQuality]);

  const uniforms = {
    uTime: { value: 0 },

    uSpeed: { value: speed },
    uNoiseStrength: { value: noiseStrength },
    uDisplacementStrength: { value: displacementStrength },
    uFractAmount: { value: fractAmount },
    uBaseTexture: { value: baseTexture },
  };

  useEffect(() => {
    onLoaded();
  }, [onLoaded]);

  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = elapsedTime;
      materialRef.current.uniforms.uSpeed.value = speed;
      materialRef.current.uniforms.uNoiseStrength.value = noiseStrength;
      materialRef.current.uniforms.uDisplacementStrength.value =
        displacementStrength;
      materialRef.current.uniforms.uFractAmount.value = fractAmount;
    }

    if (depthMaterialRef.current) {
      depthMaterialRef.current.uniforms.uTime.value = elapsedTime;
      depthMaterialRef.current.uniforms.uSpeed.value = speed;
      depthMaterialRef.current.uniforms.uNoiseStrength.value = noiseStrength;
      depthMaterialRef.current.uniforms.uDisplacementStrength.value =
        displacementStrength;
      depthMaterialRef.current.uniforms.uFractAmount.value = fractAmount;
    }

    if (meshRef.current) {
      // meshRef.current.rotation.y = elapsedTime * 0.2;
      // meshRef.current.rotation.x = elapsedTime * 0.2;
    }
  });

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={geometry}
        // @ts-ignore
        // frustumCulled={false}
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
      />
    </>
  );
};

export default Experiment;
