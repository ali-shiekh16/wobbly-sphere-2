import { useEffect, useState } from 'react';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { useMediaQuery } from 'usehooks-ts';
import Experiment from './Experiment';
import LevaWrapper from './LevaWrapper';
import './App.css';

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
