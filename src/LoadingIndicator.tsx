import React from 'react';
import './LoadingIndicator.css';

interface LoadingIndicatorProps {
  fadeOut?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  fadeOut = false,
}) => {
  return (
    <div className={`loading-container ${fadeOut ? 'fade-out' : ''}`}>
      <div className='loading-orb'>
        <div className='loading-core'></div>
        <div className='loading-ring'></div>
        <div className='loading-pulse'></div>
      </div>
      <div className='loading-text'>Loading Intelligent Orb...</div>
    </div>
  );
};

export default LoadingIndicator;
