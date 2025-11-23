import React, { useState } from 'react';
import { DictionaryEntry } from '../types';
import AudioButton from './AudioButton';

interface FlashcardProps {
  entry: DictionaryEntry;
}

const Flashcard: React.FC<FlashcardProps> = ({ entry }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleClick = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div 
      className="relative w-full max-w-sm h-96 cursor-pointer perspective-1000 mx-auto my-8"
      onClick={handleClick}
    >
      <div 
        className={`
          w-full h-full relative transform-style-3d transition-transform duration-500
          ${isFlipped ? 'rotate-y-180' : ''}
        `}
      >
        {/* Front Side */}
        <div className="absolute w-full h-full backface-hidden bg-white border-4 border-black rounded-2xl shadow-hard flex flex-col items-center justify-center p-6 overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
          <div className="absolute top-0 left-0 w-full h-2 bg-pop-blue"></div>
          {entry.imageBase64 ? (
             <img 
               src={entry.imageBase64} 
               alt={entry.term} 
               className="w-32 h-32 object-cover rounded-lg border-2 border-black mb-6"
             />
          ) : (
             <div className="w-32 h-32 bg-gray-100 rounded-lg border-2 border-black mb-6 flex items-center justify-center text-4xl">
               ?
             </div>
          )}
          <h2 className="text-3xl font-bold text-black mb-2 text-center break-words">{entry.term}</h2>
          <p className="text-gray-500 text-sm">Tap to flip</p>
        </div>

        {/* Back Side */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white border-4 border-black rounded-2xl shadow-hard flex flex-col p-6 overflow-y-auto no-scrollbar" style={{ backfaceVisibility: 'hidden' }}>
          <div className="absolute top-0 left-0 w-full h-2 bg-pop-pink"></div>
          <div className="flex justify-between items-start mb-4 mt-2">
            <h3 className="text-xl font-bold text-pop-pink">{entry.term}</h3>
            <div onClick={(e) => e.stopPropagation()}>
              <AudioButton text={entry.term} size="sm" />
            </div>
          </div>
          
          <p className="text-lg font-medium text-gray-800 mb-4 leading-snug">
            {entry.definition}
          </p>

          <div className="bg-pop-cream p-3 rounded-lg border border-gray-200 mb-2">
            <p className="text-sm italic text-gray-600">{entry.examples[0]?.original}</p>
            <p className="text-xs text-gray-400 mt-1">{entry.examples[0]?.translated}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;