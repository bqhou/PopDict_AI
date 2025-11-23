import React, { useState } from 'react';
import { playAudio } from '../services/geminiService';

interface AudioButtonProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md';
}

const AudioButton: React.FC<AudioButtonProps> = ({ text, className = '', size = 'md' }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) return;
    
    setIsPlaying(true);
    await playAudio(text);
    setIsPlaying(false);
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  // size='sm' uses p-2 for larger touch target (was p-1.5)
  const padding = size === 'sm' ? 'p-2' : 'p-3';

  return (
    <button
      onClick={handlePlay}
      disabled={isPlaying}
      className={`
        bg-pop-purple text-white rounded-full flex items-center justify-center
        hover:bg-purple-600 transition-colors active:scale-95 disabled:opacity-50
        ${padding}
        ${className}
      `}
      title="Play pronunciation"
      aria-label="Play audio"
    >
      {isPlaying ? (
        <svg className={`${iconSize} animate-pulse`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      ) : (
        <svg className={`${iconSize}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      )}
    </button>
  );
};

export default AudioButton;