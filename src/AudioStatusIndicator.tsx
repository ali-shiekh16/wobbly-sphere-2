import React from 'react';

interface AudioStatusIndicatorProps {
  isPlaying: boolean;
  volume: number;
}

const AudioStatusIndicator: React.FC<AudioStatusIndicatorProps> = ({
  isPlaying,
  volume,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: isPlaying
          ? 'rgba(175, 0, 255, 0.8)'
          : 'rgba(255, 0, 0, 0.8)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isPlaying ? '#00ff00' : '#ff0000',
          animation: isPlaying ? 'pulse 2s infinite' : 'none',
        }}
      ></div>
      {isPlaying ? 'Audio Playing' : 'Audio Paused'}
      {isPlaying && (
        <div style={{ fontSize: '10px', opacity: 0.8 }}>
          Vol: {(volume * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
};

export default AudioStatusIndicator;
