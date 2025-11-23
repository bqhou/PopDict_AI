import React, { useState } from 'react';
import { DictionaryEntry } from '../types';
import AudioButton from './AudioButton';

interface EntryCardProps {
  entry: DictionaryEntry;
  onSave?: () => void;
  isSaved?: boolean;
  onClose?: () => void;
}

const EntryCard: React.FC<EntryCardProps> = ({ entry, onSave, isSaved = false, onClose }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    
    const text = `${entry.term}\n\n${entry.definition}\n\n${entry.usageNote ? `Note: ${entry.usageNote}\n` : ''}Shared via PopDict`;
    const url = window.location.href;

    try {
      // Strategy 1: Web Share API with Image (Mobile/Supported Browsers)
      if (navigator.share && entry.imageBase64) {
         try {
            // Convert Base64 to Blob/File
            const res = await fetch(entry.imageBase64);
            const blob = await res.blob();
            const file = new File([blob], `${entry.term.replace(/\s+/g, '_')}.png`, { type: blob.type });
            
            const shareData = {
                title: `PopDict: ${entry.term}`,
                text: text,
                files: [file]
            };

            // Check if the browser supports sharing this specific data
            if (navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
                setIsSharing(false);
                return; // Success
            }
         } catch (e) {
            console.warn("Image sharing failed or not supported, falling back to text", e);
         }
      }

      // Strategy 2: Web Share API Text Only
      if (navigator.share) {
        await navigator.share({
            title: `PopDict: ${entry.term}`,
            text: text,
            url: url
        });
      } else {
        // Strategy 3: Fallback to Clipboard
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      }
    } catch (e) {
        console.error("Sharing failed", e);
    } finally {
        setIsSharing(false);
    }
  };

  return (
    <div className="bg-white border-4 border-black rounded-3xl overflow-hidden shadow-hard animate-fade-in-up relative">
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-3 left-3 z-10 bg-black/50 hover:bg-black text-white p-2 rounded-full backdrop-blur-sm transition-colors touch-manipulation"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Image Header */}
      <div className="h-40 sm:h-48 bg-gray-100 border-b-4 border-black relative overflow-hidden">
         {entry.imageBase64 ? (
            <img src={entry.imageBase64} alt="Visualization" className="w-full h-full object-cover" />
         ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-pattern-dots">No Image Generated</div>
         )}
         
         <div className="absolute top-3 right-3 flex gap-2 z-10">
             {/* Share Button */}
             <button 
              onClick={handleShare}
              disabled={isSharing}
              className={`p-2.5 rounded-full border-2 border-black shadow-hard-sm transition-all touch-manipulation bg-white text-black hover:bg-gray-50 active:scale-95 flex items-center justify-center disabled:opacity-50`}
              title="Share"
            >
              {copyFeedback ? (
                  <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
              ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
              )}
            </button>

            {onSave && (
                <button 
                onClick={onSave}
                disabled={isSaved}
                className={`p-2.5 rounded-full border-2 border-black shadow-hard-sm transition-colors touch-manipulation ${isSaved ? 'bg-green-400 text-white' : 'bg-white text-black hover:bg-gray-50'}`}
                title={isSaved ? "Saved" : "Save to Notebook"}
                >
                <svg className="w-6 h-6" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                </button>
            )}
         </div>
      </div>

      <div className="p-5 sm:p-6">
        {/* Header & Audio */}
        <div className="flex items-start justify-between mb-3 gap-3">
          <h2 className="text-3xl sm:text-4xl font-black text-black break-words flex-1 leading-tight">{entry.term}</h2>
          <div className="flex-shrink-0 mt-1">
            <AudioButton text={entry.term} />
          </div>
        </div>
        
        <p className="text-base sm:text-lg text-gray-700 font-medium mb-6 leading-relaxed">
          {entry.definition}
        </p>

        {/* Usage Note */}
        {entry.usageNote && (
          <div className="mb-6 bg-pop-cream rounded-xl border-2 border-black border-dashed p-4 relative mt-8">
            <div className="absolute -top-4 left-4 bg-pop-purple text-white text-xs font-bold px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transform -rotate-2">
              💡 USAGE NOTE
            </div>
            <p className="text-sm sm:text-base text-gray-800 italic leading-relaxed">
              "{entry.usageNote}"
            </p>
          </div>
        )}

        {/* Examples */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Examples</h3>
          {entry.examples.map((ex, idx) => (
            <div key={idx} className="flex items-start space-x-3 group bg-gray-50 p-3 rounded-xl border border-transparent hover:border-gray-200 transition-colors">
              <div className="mt-1 flex-shrink-0">
                <AudioButton text={ex.original} size="sm" className="bg-gray-800 hover:bg-black shadow-none" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-base sm:text-lg text-gray-900 leading-snug">{ex.original}</p>
                <p className="text-sm text-gray-500 mt-0.5 leading-snug">{ex.translated}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EntryCard;