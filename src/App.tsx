import { useEffect, useState } from 'react';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { Canvas, useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { Suspense, useMemo, useRef } from 'react';
import {
  Color,
  IcosahedronGeometry,
  MeshDepthMaterial,
  MeshPhysicalMaterial,
  RGBADepthPacking,
  Mesh,
} from 'three';
import CustomShaderMaterial from 'three-custom-shader-material';
import { useMediaQuery } from 'usehooks-ts';
import vertexShader from '../vertex';
import fragmentShader from './fragment';
import LevaWrapper from './LevaWrapper';
import './App.css';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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
  const meshRef = useRef<Mesh>(null);

  const {
    gradientStrength,
    color,
    speed,
    noiseStrength,
    displacementStrength,
    fractAmount,
    roughness,
    metalness,
    clearcoat,
    reflectivity,
    ior,
    iridescence,
  } = useControls({
    gradientStrength: {
      value: 1,
      min: 1,
      max: 3,
      step: 0.001,
    },
    color: '#af00ff',
    speed: {
      value: 18.5,
      min: 0,
      max: 20,
      step: 0.001,
    },
    noiseStrength: {
      value: 0.24,
      min: 0,
      max: 15,
      step: 0.001,
    },
    displacementStrength: {
      value: 0.61,
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
    roughness: {
      min: 0,
      max: 1,
      step: 0.001,
      value: 0.56,
    },
    metalness: {
      min: 0,
      max: 1,
      step: 0.001,
      value: 1,
    },
    clearcoat: {
      min: 0,
      max: 1,
      step: 0.001,
      value: 0,
    },
    reflectivity: {
      min: 0,
      max: 1,
      step: 0.001,
      value: 0.46,
    },
    ior: {
      min: 0.001,
      max: 5,
      step: 0.001,
      value: 2.81,
    },
    iridescence: {
      min: 0,
      max: 1,
      step: 0.001,
      value: 0.96,
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
      new IcosahedronGeometry(1.3, shouldReduceQuality ? 128 : 200)
    );
    geometry.computeTangents();
    return geometry;
  }, [shouldReduceQuality]);

  const uniforms = {
    uTime: { value: 0 },
    uColor: { value: new Color(color) },
    uGradientStrength: { value: gradientStrength },
    uSpeed: { value: speed },
    uNoiseStrength: { value: noiseStrength },
    uDisplacementStrength: { value: displacementStrength },
    uFractAmount: { value: fractAmount },
  };

  useEffect(() => {
    onLoaded();
  }, [onLoaded]);

  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = elapsedTime;
      materialRef.current.uniforms.uColor.value = new Color(color);
      materialRef.current.uniforms.uGradientStrength.value = gradientStrength;
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
      meshRef.current.rotation.y = elapsedTime * 0.2;
      meshRef.current.rotation.x = elapsedTime * 0.2;
    }
  });

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={geometry}
        frustumCulled={false}
        position={[0, isMobile ? -1.3 * 0 : 0, 0]}
      >
        {' '}
        <CustomShaderMaterial
          ref={materialRef}
          baseMaterial={MeshPhysicalMaterial}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          roughness={roughness}
          metalness={metalness}
          reflectivity={reflectivity}
          clearcoat={clearcoat}
          ior={ior}
          iridescence={iridescence}
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

const App = () => {
  const isTablet = useMediaQuery('(max-width: 1199px)');
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      document.body.classList.remove('loading');
    }
  }, [isLoaded]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  return (
    <div className='container'>
      <LevaWrapper />
      <Canvas
        camera={{
          position: [0, 0, isTablet ? 9 : 6],
          fov: 45,
          near: 0.1,
          far: 1000,
        }}
        gl={{ alpha: false }}
      >
        <Suspense fallback={null}>
          <Experiment
            shouldReduceQuality={isTablet}
            isMobile={isMobile}
            onLoaded={handleLoad}
          />
        </Suspense>
        <OrbitControls />
        <EffectComposer>
          <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default App;
