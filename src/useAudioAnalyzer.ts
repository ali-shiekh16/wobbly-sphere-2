import { useEffect, useRef, useState } from 'react';

interface AudioData {
  volume: number;
  frequency: number;
  bass: number;
  mid: number;
  treble: number;
  isPlaying: boolean;
}

export const useAudioAnalyzer = (audioUrl: string) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isInitializedRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  // Smoothing factors for different frequencies
  const smoothingFactors = useRef({
    volume: 0.8,
    bass: 0.85,
    mid: 0.7,
    treble: 0.6,
  });

  // Previous smoothed values
  const smoothedValues = useRef({
    volume: 0,
    bass: 0,
    mid: 0,
    treble: 0,
  });

  const [audioData, setAudioData] = useState<AudioData>({
    volume: 0,
    frequency: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    isPlaying: false,
  });

  const calculateBand = (
    dataArray: Uint8Array,
    startIndex: number,
    endIndex: number
  ): number => {
    let sum = 0;
    const count = endIndex - startIndex;
    for (let i = startIndex; i < endIndex && i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return sum / count / 255;
  };

  const startAnalysis = () => {
    const analyzeAudio = () => {
      if (
        !analyzerRef.current ||
        !dataArrayRef.current ||
        !audioContextRef.current
      ) {
        return;
      }

      analyzerRef.current.getByteFrequencyData(dataArrayRef.current);

      // Calculate overall volume (RMS)
      let sum = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += dataArrayRef.current[i] * dataArrayRef.current[i];
      }
      const rawVolume = Math.sqrt(sum / dataArrayRef.current.length) / 255;

      // Calculate frequency bands
      const rawBass = calculateBand(dataArrayRef.current, 0, 10);
      const rawMid = calculateBand(dataArrayRef.current, 10, 40);
      const rawTreble = calculateBand(dataArrayRef.current, 40, 128);

      // Apply exponential moving average smoothing
      const smoothFactor = smoothingFactors.current;
      smoothedValues.current.volume =
        smoothedValues.current.volume * smoothFactor.volume +
        rawVolume * (1 - smoothFactor.volume);
      smoothedValues.current.bass =
        smoothedValues.current.bass * smoothFactor.bass +
        rawBass * (1 - smoothFactor.bass);
      smoothedValues.current.mid =
        smoothedValues.current.mid * smoothFactor.mid +
        rawMid * (1 - smoothFactor.mid);
      smoothedValues.current.treble =
        smoothedValues.current.treble * smoothFactor.treble +
        rawTreble * (1 - smoothFactor.treble);

      // Find dominant frequency
      let maxIndex = 0;
      let maxValue = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        if (dataArrayRef.current[i] > maxValue) {
          maxValue = dataArrayRef.current[i];
          maxIndex = i;
        }
      }
      const frequency =
        (maxIndex / dataArrayRef.current.length) *
        (audioContextRef.current.sampleRate / 2);

      setAudioData({
        volume: smoothedValues.current.volume,
        frequency: frequency / 1000,
        bass: smoothedValues.current.bass,
        mid: smoothedValues.current.mid,
        treble: smoothedValues.current.treble,
        isPlaying: audioRef.current ? !audioRef.current.paused : false,
      });

      // Debug audio levels occasionally
      if (Math.random() < 0.01) {
        // 1% chance to log (about once per second at 60fps)
        console.log('🎵 Audio Analysis:', {
          volume: (smoothedValues.current.volume * 100).toFixed(1) + '%',
          bass: (smoothedValues.current.bass * 100).toFixed(1) + '%',
          mid: (smoothedValues.current.mid * 100).toFixed(1) + '%',
          treble: (smoothedValues.current.treble * 100).toFixed(1) + '%',
          rawDataSample: Array.from(dataArrayRef.current.slice(0, 5)),
        });
      }

      // Continue analysis if audio is playing
      if (audioRef.current && !audioRef.current.paused) {
        animationFrameRef.current = requestAnimationFrame(analyzeAudio);
      }
    };

    analyzeAudio();
  };

  const initializeAudio = async () => {
    if (isInitializedRef.current) return;

    console.log('Initializing audio...');

    const audio = new Audio(audioUrl);
    console.log('🎵 Created audio element for:', audioUrl);
    console.log('Audio element:', audio);

    // Test if the audio file exists by trying to load it
    try {
      const testResponse = await fetch(audioUrl);
      console.log('📁 Audio file fetch test:', {
        status: testResponse.status,
        ok: testResponse.ok,
        contentType: testResponse.headers.get('content-type'),
        contentLength: testResponse.headers.get('content-length'),
      });
    } catch (fetchError) {
      console.error('❌ Could not fetch audio file:', fetchError);
    }

    audio.loop = true;
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audio.volume = 0.8; // Increase initial volume
    audio.muted = false; // Explicitly ensure it's not muted
    audioRef.current = audio;

    // Create audio context and analyzer
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    const analyzer = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audio);

    analyzer.fftSize = 256;
    analyzer.smoothingTimeConstant = 0.8;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    source.connect(analyzer);
    analyzer.connect(audioContext.destination);

    analyzerRef.current = analyzer;
    dataArrayRef.current = dataArray;

    isInitializedRef.current = true;

    // Set up event listeners
    audio.addEventListener('play', () => {
      console.log('🎵 Audio play event fired');
      console.log('Audio volume check:', {
        audioVolume: audio.volume,
        audioMuted: audio.muted,
        contextState: audioContext.state,
      });
      setAudioData(prev => ({ ...prev, isPlaying: true }));
      startAnalysis();
    });

    audio.addEventListener('pause', () => {
      console.log('Audio pause event fired');
      setAudioData(prev => ({ ...prev, isPlaying: false }));
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    });

    audio.addEventListener('loadeddata', () => {
      console.log('📁 Audio loaded successfully');
      console.log('Audio file info:', {
        duration: audio.duration,
        volume: audio.volume,
        muted: audio.muted,
        src: audio.src,
        readyState: audio.readyState,
        networkState: audio.networkState,
        paused: audio.paused,
        ended: audio.ended,
      });
    });

    audio.addEventListener('error', e => {
      console.error('🚨 Audio loading error:', e);
      console.error('Audio error details:', {
        error: audio.error,
        networkState: audio.networkState,
        readyState: audio.readyState,
      });
    });

    audio.addEventListener('canplay', () => {
      console.log('✅ Audio can play');
    });

    audio.addEventListener('canplaythrough', () => {
      console.log('✅ Audio can play through');
    });

    audio.addEventListener('timeupdate', () => {
      // Log occasionally to see if time is progressing
      if (audio.currentTime > 0 && Math.floor(audio.currentTime) % 5 === 0) {
        console.log('⏱️ Audio time update:', audio.currentTime.toFixed(1));
      }
    });

    audio.addEventListener('volumechange', () => {
      console.log('🔊 Volume changed:', {
        volume: audio.volume,
        muted: audio.muted,
      });
    });

    // Wait for audio to load
    await new Promise((resolve, reject) => {
      if (audio.readyState >= 2) {
        resolve(true);
      } else {
        audio.addEventListener('loadeddata', () => resolve(true));
        audio.addEventListener('error', reject);

        // Add a timeout
        setTimeout(() => resolve(true), 3000);
      }
    });

    // Try to start audio immediately with multiple attempts
    const startAudio = async () => {
      try {
        console.log('Attempting to start audio...');

        // Resume audio context first
        if (audioContext.state === 'suspended') {
          console.log('Audio context is suspended, resuming...');
          await audioContext.resume();
        }

        // Force audio to be ready
        audio.muted = false;
        audio.volume = 0.8; // Increase volume
        audio.currentTime = 0;

        console.log('Audio settings:', {
          volume: audio.volume,
          muted: audio.muted,
          readyState: audio.readyState,
          duration: audio.duration || 'unknown',
        });

        // Try to play
        const playPromise = audio.play();
        console.log('🎮 Play promise created:', !!playPromise);

        if (playPromise !== undefined) {
          await playPromise;
          console.log('✅ Audio started playing automatically');

          // Verify it's actually playing
          setTimeout(() => {
            console.log('🔍 Post-play verification:', {
              paused: audio.paused,
              currentTime: audio.currentTime,
              duration: audio.duration,
              readyState: audio.readyState,
            });
          }, 1000);

          return true;
        } else {
          console.log('❌ Play promise is undefined');
          return false;
        }
      } catch (error) {
        console.log(
          '❌ Auto-play prevented:',
          error instanceof Error ? error.message : String(error)
        );
        return false;
      }
    };

    const audioStarted = await startAudio();

    // If autoplay failed, set up comprehensive user interaction handler
    if (!audioStarted) {
      console.log('🎵 Setting up user interaction handlers...');

      const handleUserInteraction = async (event: Event) => {
        console.log('👆 User interaction detected:', event.type);

        try {
          // Resume audio context if needed
          if (audioContext.state === 'suspended') {
            console.log('Resuming audio context after user interaction...');
            await audioContext.resume();
          }

          // Ensure audio is ready to play
          audio.muted = false;
          audio.volume = 0.8; // Increase volume

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise;
            console.log('✅ Audio started after user interaction');

            // Verify playback started
            setTimeout(() => {
              console.log('🔍 User interaction play verification:', {
                paused: audio.paused,
                currentTime: audio.currentTime,
                volume: audio.volume,
                muted: audio.muted,
              });
            }, 500);

            // Remove all listeners after successful play
            document.removeEventListener('click', handleUserInteraction, true);
            document.removeEventListener(
              'keydown',
              handleUserInteraction,
              true
            );
            document.removeEventListener(
              'touchstart',
              handleUserInteraction,
              true
            );
            document.removeEventListener(
              'mousedown',
              handleUserInteraction,
              true
            );
            document.removeEventListener(
              'pointerdown',
              handleUserInteraction,
              true
            );
          } else {
            console.error(
              '❌ Play promise is undefined after user interaction'
            );
          }
        } catch (e) {
          console.error('Failed to play audio after user interaction:', e);
        }
      };

      // Add multiple event listeners with capture for immediate response
      document.addEventListener('click', handleUserInteraction, true);
      document.addEventListener('keydown', handleUserInteraction, true);
      document.addEventListener('touchstart', handleUserInteraction, true);
      document.addEventListener('mousedown', handleUserInteraction, true);
      document.addEventListener('pointerdown', handleUserInteraction, true);

      // Also add a visual cue
      console.log('🖱️ Click anywhere on the page to start audio');

      // Create a temporary overlay to encourage user interaction
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Arial, sans-serif;
        font-size: 24px;
        z-index: 10000;
        cursor: pointer;
      `;
      overlay.textContent = '🎵 Click anywhere to start audio';

      const startAudioOnClick = async () => {
        try {
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }
          audio.muted = false;
          audio.volume = 0.8; // Increase volume
          await audio.play();
          overlay.remove();
          console.log('✅ Audio started from overlay click');
        } catch (e) {
          console.error('Failed to start audio from overlay:', e);
        }
      };

      overlay.addEventListener('click', startAudioOnClick);
      document.body.appendChild(overlay);

      // Remove overlay after successful audio start
      audio.addEventListener(
        'play',
        () => {
          if (overlay.parentNode) {
            overlay.remove();
          }
        },
        { once: true }
      );
    }
  };

  useEffect(() => {
    console.log('🎵 Audio Analyzer Hook initialized');
    initializeAudio();

    return () => {
      console.log('🎵 Audio Analyzer Hook cleanup');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioUrl]);

  // Add debugging info (more detailed)
  useEffect(() => {
    const debugInterval = setInterval(() => {
      if (audioRef.current && audioContextRef.current) {
        console.log('🔍 Detailed Audio Status:', {
          // Audio element status
          playing: !audioRef.current.paused,
          currentTime: audioRef.current.currentTime.toFixed(1),
          duration: audioRef.current.duration || 'unknown',
          volume: audioRef.current.volume,
          muted: audioRef.current.muted,
          readyState: audioRef.current.readyState,
          networkState: audioRef.current.networkState,
          ended: audioRef.current.ended,

          // Audio context status
          contextState: audioContextRef.current.state,
          sampleRate: audioContextRef.current.sampleRate,

          // Analysis data
          analysisVolume: (audioData.volume * 100).toFixed(0) + '%',
          analysisBass: (audioData.bass * 100).toFixed(0) + '%',

          // Raw data check
          hasAnalyzer: !!analyzerRef.current,
          hasDataArray: !!dataArrayRef.current,
        });

        // Check if we're getting any audio data at all
        if (dataArrayRef.current) {
          const totalEnergy = Array.from(dataArrayRef.current).reduce(
            (sum, val) => sum + val,
            0
          );
          console.log('📊 Raw audio energy total:', totalEnergy);
        }
      }
    }, 5000); // Log every 5 seconds for more frequent updates

    return () => clearInterval(debugInterval);
  }, [audioData.volume, audioData.bass]);

  return { audioData };
};
