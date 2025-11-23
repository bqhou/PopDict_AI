export enum Language {
  ENGLISH = 'English',
  SPANISH = 'Spanish',
  FRENCH = 'French',
  MANDARIN = 'Mandarin Chinese',
  HINDI = 'Hindi',
  JAPANESE = 'Japanese'
}

export interface ExampleSentence {
  original: string;
  translated: string;
}

export interface DictionaryEntry {
  id: string;
  term: string;
  nativeLanguage: Language;
  targetLanguage: Language;
  definition: string;
  usageNote?: string;
  examples: ExampleSentence[];
  imageBase64?: string; // Base64 string of the generated image
  timestamp: number;
}

export interface StoryResponse {
  story: string;
}

export type ViewMode = 'SEARCH' | 'NOTEBOOK';