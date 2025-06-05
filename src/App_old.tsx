import { Canvas } from '@react-three/fiber';
import './App.css';
import { Environment, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';

function App() {
  return (
    <>
      <div className='container'>
        <Canvas>
          {/* Your regular scene contents go here, like always ... */}
          <EffectComposer>
            {/* <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} /> */}
            <Bloom
              luminanceThreshold={0}
              luminanceSmoothing={0.9}
              height={300}
            />
            {/* <Noise opacity={0.02} /> */}
            {/* <Vignette eskil={false} offset={0.1} darkness={1.1} /> */}
          </EffectComposer>
          <ambientLight />
          <Environment preset='city' />
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color='orange' />
          </mesh>
          <OrbitControls />
        </Canvas>
      </div>
    </>
  );
}

export default App;
