import { useEffect, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useMediaQuery } from 'usehooks-ts';
import LevaWrapper from './LevaWrapper';
import LoadingIndicator from './LoadingIndicator';
import AudioStatusIndicator from './AudioStatusIndicator';
import './App.css';
import { useAudioAnalyzer } from './useAudioAnalyzer';
import Sphere from './Sphere';

// WebGL detection utility
const detectWebGL = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      return { supported: false, version: 'none' };
    }
    const version = gl.getParameter(gl.VERSION);
    return {
      supported: true,
      version: version,
      isWebGL2: !!canvas.getContext('webgl2'),
    };
  } catch (e) {
    return { supported: false, version: 'error', error: e };
  }
};

const App = () => {
  const isTablet = useMediaQuery('(max-width: 1199px)');
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);

  // Audio analysis
  const { audioData } = useAudioAnalyzer('/audio.mp3');

  // Check WebGL support on component mount
  useEffect(() => {
    const webglInfo = detectWebGL();
    setWebglSupported(webglInfo.supported);
    // Since we are not loading a heavy model anymore, we can consider it loaded.
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      document.body.classList.remove('loading');
      // Start fade out animation
      setFadeOut(true);
      // Hide loading indicator after fade animation completes
      setTimeout(() => {
        setShowLoading(false);
      }, 500);
    }
  }, [isLoaded]);

  return (
    <div className='container'>
      {showLoading && <LoadingIndicator fadeOut={fadeOut} />}
      <AudioStatusIndicator
        isPlaying={audioData.isPlaying}
        volume={audioData.volume}
      />
      <LevaWrapper />

      {!webglSupported ? (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#af00ff',
            fontSize: '20px',
            textAlign: 'center',
            fontFamily: 'Arial, sans-serif',
            maxWidth: '500px',
            padding: '20px',
          }}
        >
          <div style={{ marginBottom: '20px', fontSize: '24px' }}>
            ⚠️ WebGL Not Supported
          </div>
          <div style={{ marginBottom: '15px' }}>
            Your browser doesn't support WebGL, which is required for this 3D
            experience.
          </div>
          <div style={{ fontSize: '16px', opacity: 0.8 }}>
            Try:
            <ul style={{ textAlign: 'left', marginTop: '10px' }}>
              <li>Updating your browser to the latest version</li>
              <li>Enabling hardware acceleration in browser settings</li>
              <li>Using Chrome, Firefox, or Edge</li>
              <li>Updating your graphics drivers</li>
            </ul>
          </div>
        </div>
      ) : (
        <Canvas
          camera={{
            position: [0, 0, isTablet ? 9 : 6],
            fov: 45,
            near: 0.1,
            far: 1000,
          }}
          gl={{
            alpha: false,
            antialias: true,
            powerPreference: 'default',
            failIfMajorPerformanceCaveat: false,
            preserveDrawingBuffer: false,
            premultipliedAlpha: false,
          }}
          fallback={
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#af00ff',
                fontSize: '18px',
                textAlign: 'center',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              <div>WebGL is not supported in your browser</div>
              <div
                style={{ fontSize: '14px', marginTop: '10px', opacity: 0.7 }}
              >
                Please try updating your browser or enabling hardware
                acceleration
              </div>
            </div>
          }
        >
          <Suspense fallback={null}>
            <Sphere
              audioData={audioData}
              position={[-2.2, 1.2, 0]}
              shouldReduceQuality={isTablet}
              isMobile={isMobile}
              folder='Sphere 1'
            />
            <Sphere
              audioData={audioData}
              position={[2.2, 1.2, 0]}
              shouldReduceQuality={isTablet}
              isMobile={isMobile}
              folder='Sphere 2'
            />
          </Suspense>
          <ambientLight color={'#fff'} intensity={1} />
          <directionalLight
            color={'#fff'}
            intensity={5}
            position={[-2, 2, 3.5]}
            castShadow={false}
          />
        </Canvas>
      )}
    </div>
  );
};

export default App;
