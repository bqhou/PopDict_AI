import React, { useState, useEffect } from 'react';
import { Language, DictionaryEntry, ViewMode } from './types';
import { generateDefinition, generateConceptImage, generateStory } from './services/geminiService';
import AudioButton from './components/AudioButton';
import EntryCard from './components/EntryCard';
import Flashcard from './components/Flashcard';

// --- Sub-components for Layout ---

const Header = ({ view, setView, count }: { view: ViewMode, setView: (v: ViewMode) => void, count: number }) => (
  <nav className="fixed top-0 left-0 right-0 bg-white border-b-4 border-black z-50 px-4 py-3 shadow-sm">
    <div className="max-w-md mx-auto flex justify-between items-center">
      <h1 className="text-2xl font-black italic tracking-tighter text-black select-none cursor-pointer" onClick={() => setView('SEARCH')}>
        POP<span className="text-pop-pink">DICT</span> <span className="text-xs font-normal text-gray-500 not-italic ml-1">CN ➔ EN</span>
      </h1>
      <div className="flex space-x-2">
        <button 
          onClick={() => setView('SEARCH')}
          className={`px-3 py-1 rounded-full font-bold text-sm transition-all ${view === 'SEARCH' ? 'bg-pop-blue text-white border-2 border-black shadow-hard-sm' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          Search
        </button>
        <button 
          onClick={() => setView('NOTEBOOK')}
          className={`relative px-3 py-1 rounded-full font-bold text-sm transition-all ${view === 'NOTEBOOK' ? 'bg-pop-yellow text-black border-2 border-black shadow-hard-sm' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          Notebook
          {count > 0 && <span className="absolute -top-1 -right-1 bg-pop-pink text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm">{count}</span>}
        </button>
      </div>
    </div>
  </nav>
);

// --- Main App ---

const App = () => {
  // Hardcoded for Chinese -> English workflow
  const nativeLang = Language.MANDARIN;
  const targetLang = Language.ENGLISH;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEntry, setCurrentEntry] = useState<DictionaryEntry | null>(null);
  const [notebook, setNotebook] = useState<DictionaryEntry[]>(() => {
    const saved = localStorage.getItem('popdict-notebook');
    return saved ? JSON.parse(saved) : [];
  });
  const [view, setView] = useState<ViewMode>('SEARCH');
  const [story, setStory] = useState<string | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  
  // Study Mode State
  const [isStudying, setIsStudying] = useState(false);
  const [studyIndex, setStudyIndex] = useState(0);
  
  // State to track which notebook entry is being viewed in detail
  const [viewingEntry, setViewingEntry] = useState<DictionaryEntry | null>(null);

  // Persist notebook
  useEffect(() => {
    localStorage.setItem('popdict-notebook', JSON.stringify(notebook));
  }, [notebook]);

  // Reset states when switching tabs
  useEffect(() => {
    setViewingEntry(null);
    setIsStudying(false);
  }, [view]);

  // Handlers
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setError(null);
    setCurrentEntry(null);

    try {
      // 1. Get text definition
      const textData = await generateDefinition(searchTerm, nativeLang, targetLang);
      
      // 2. Get Image
      const imageBase64 = await generateConceptImage(`${textData.term} (${targetLang}) - ${textData.definition}`);

      const newEntry: DictionaryEntry = {
        id: Date.now().toString(),
        ...textData,
        imageBase64,
        timestamp: Date.now()
      };

      setCurrentEntry(newEntry);
    } catch (err) {
      console.error(err);
      setError("Oops! Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToNotebook = () => {
    if (currentEntry && !notebook.find(n => n.term === currentEntry.term)) {
      setNotebook([currentEntry, ...notebook]);
    }
  };

  const handleDeleteEntry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotebook(prev => prev.filter(n => n.id !== id));
  };

  const handleGenerateStory = async () => {
    if (notebook.length < 3) return;
    setIsGeneratingStory(true);
    try {
      const result = await generateStory(notebook.slice(0, 10), nativeLang); // limit to 10 words
      setStory(result);
    } catch (err) {
      setStory("Couldn't generate a story right now.");
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const startStudySession = () => {
    if (notebook.length === 0) return;
    setStudyIndex(0);
    setIsStudying(true);
  };

  const nextCard = () => {
    setStudyIndex((prev) => (prev + 1) % notebook.length);
  };

  const prevCard = () => {
    setStudyIndex((prev) => (prev - 1 + notebook.length) % notebook.length);
  };

  const isSaved = currentEntry && notebook.some(n => n.term === currentEntry.term);

  // --- Render Methods ---

  const renderStudyMode = () => {
    const entry = notebook[studyIndex];
    if (!entry) return null;

    return (
      <div className="fixed inset-0 z-[100] bg-pop-cream flex flex-col items-center justify-center p-4 animate-fade-in-up">
        {/* Close Button */}
        <button 
          onClick={() => setIsStudying(false)}
          className="absolute top-4 right-4 bg-white border-2 border-black p-2 rounded-full shadow-hard hover:scale-95 transition-transform z-50"
          aria-label="Exit Study Mode"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="w-full max-w-md flex flex-col items-center">
           <div className="text-center mb-4">
              <h2 className="text-3xl font-black italic tracking-tight">STUDY MODE</h2>
              <p className="font-bold text-pop-purple mt-1">Card {studyIndex + 1} of {notebook.length}</p>
           </div>

           <Flashcard entry={entry} />

           <div className="flex justify-center gap-4 mt-8 w-full px-4">
              <button 
                onClick={prevCard}
                className="flex-1 bg-white border-2 border-black py-3 rounded-xl font-bold shadow-hard hover:bg-gray-50 active:scale-95 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
              >
                Previous
              </button>
              <button 
                onClick={nextCard}
                className="flex-1 bg-pop-blue text-white border-2 border-black py-3 rounded-xl font-bold shadow-hard hover:brightness-110 active:scale-95 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
              >
                Next
              </button>
           </div>
        </div>
      </div>
    );
  };

  const renderSearch = () => (
    <div className="max-w-md mx-auto pt-24 pb-12 px-4 min-h-screen">
      
      {/* Search Bar */}
      <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-hard mb-8">
        <div className="mb-2 text-sm font-bold text-gray-400 uppercase tracking-wider text-center">
          Chinese ➔ English
        </div>
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter a Chinese or English word..."
            className="w-full border-2 border-black rounded-xl p-4 pr-12 text-lg font-bold placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-pop-blue/20"
          />
          <button 
            type="submit"
            disabled={isLoading}
            className="absolute right-2 top-2 bottom-2 bg-pop-pink text-white aspect-square rounded-lg flex items-center justify-center hover:scale-95 transition-transform disabled:opacity-50 active:scale-90"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded-xl border-2 border-red-200 mb-8 text-center font-bold animate-fade-in-up">
          {error}
        </div>
      )}

      {/* Result Card */}
      {currentEntry && (
        <EntryCard 
          entry={currentEntry} 
          onSave={handleSaveToNotebook} 
          isSaved={isSaved} 
        />
      )}
    </div>
  );

  const renderNotebook = () => {
    // If viewing a single entry in detail
    if (viewingEntry) {
      return (
        <div className="max-w-md mx-auto pt-24 pb-12 px-4 min-h-screen animate-fade-in-up">
           <div className="mb-6">
             <button 
               onClick={() => setViewingEntry(null)}
               className="flex items-center text-sm font-bold text-gray-500 hover:text-black transition-colors py-2 px-1"
             >
               <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
               </svg>
               Back to Notebook
             </button>
           </div>
           <EntryCard 
             entry={viewingEntry} 
             onClose={() => setViewingEntry(null)}
             // Hide save button as it's already saved
           />
        </div>
      );
    }

    // List View
    return (
      <div className="max-w-md mx-auto pt-24 pb-12 px-4 min-h-screen">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-3xl font-black">My Notebook</h2>
            <span className="text-pop-purple font-bold">{notebook.length} words</span>
          </div>
          {notebook.length > 0 && (
            <button 
              onClick={startStudySession}
              className="bg-pop-pink text-white border-2 border-black px-4 py-2 rounded-xl font-bold shadow-hard hover:scale-105 active:scale-95 transition-transform flex items-center"
            >
              <span className="mr-2 text-lg">🎓</span> Study
            </button>
          )}
        </div>

        {/* Story Generator */}
        {notebook.length >= 3 && (
          <div className="mb-8 bg-gradient-to-r from-pop-blue to-pop-purple p-1 rounded-2xl shadow-hard">
            <div className="bg-white rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg flex items-center">
                  <span className="text-2xl mr-2">📖</span> Story Mode
                </h3>
                <button 
                  onClick={handleGenerateStory}
                  disabled={isGeneratingStory}
                  className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {isGeneratingStory ? 'Writing...' : 'Make up a story'}
                </button>
              </div>
              {story ? (
                <div className="bg-pop-cream p-4 rounded-lg border-2 border-gray-100 prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-base">
                    {story.split(/(\*\*.*?\*\*)/g).map((part, i) => 
                      (part.startsWith('**') && part.endsWith('**')) 
                        ? <strong key={i} className="text-pop-purple">{part.slice(2, -2)}</strong> 
                        : <span key={i}>{part}</span>
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Generate a fun story using your saved words to help you memorize them!</p>
              )}
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-4">
          {notebook.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p className="text-xl mb-2">Empty Notebook</p>
              <p className="text-sm">Go search and save some cool words!</p>
            </div>
          ) : (
            notebook.map((entry) => (
              <div 
                key={entry.id} 
                onClick={() => setViewingEntry(entry)}
                className="bg-white border-2 border-black rounded-xl p-4 shadow-sm hover:shadow-hard transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98]"
              >
                <div className="flex items-center space-x-4 overflow-hidden">
                  {entry.imageBase64 ? (
                     <img src={entry.imageBase64} className="w-16 h-16 rounded-md object-cover border border-gray-200 flex-shrink-0" alt="" />
                  ) : (
                     <div className="w-16 h-16 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-400 flex-shrink-0">No IMG</div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-lg truncate text-black">{entry.term}</p>
                    <p className="text-sm text-gray-500 truncate">{entry.definition}</p>
                  </div>
                </div>
                <div className="flex items-center pl-2 gap-2 sm:gap-3">
                   {/* Stop propagation on audio to allow playing without opening detail view */}
                   <div onClick={(e) => e.stopPropagation()}>
                      <AudioButton text={entry.term} size="sm" />
                   </div>
                   
                   <button 
                     onClick={(e) => handleDeleteEntry(entry.id, e)}
                     className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                     title="Remove from Notebook"
                   >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                   </button>

                   <svg className="w-6 h-6 text-gray-300 group-hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                   </svg>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-pop-cream min-h-screen font-sans text-gray-900">
      <Header view={view} setView={setView} count={notebook.length} />
      
      <main>
        {isStudying ? renderStudyMode() : (
          <>
            {view === 'SEARCH' && renderSearch()}
            {view === 'NOTEBOOK' && renderNotebook()}
          </>
        )}
      </main>
    </div>
  );
};

export default App;