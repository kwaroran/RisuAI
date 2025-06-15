export interface SummaryUI {
  originalRef: HTMLTextAreaElement;
  isTranslating: boolean;
  translation: string | null;
  translationRef: HTMLTextAreaElement;
  isRerolling: boolean;
  rerolledText: string | null;
  isRerolledTranslating: boolean;
  rerolledTranslation: string | null;
  rerolledTranslationRef: HTMLTextAreaElement;
  chatMemoRefs: HTMLButtonElement[];
}

export interface ExpandedMessageUI {
  summaryIndex: number;
  selectedChatMemo: string;
  isTranslating: boolean;
  translation: string | null;
  translationRef: HTMLTextAreaElement;
}

export interface SearchUI {
  ref: HTMLInputElement;
  query: string;
  results: SearchResult[];
  currentResultIndex: number;
  requestedSearchFromIndex: number;
  isNavigating: boolean;
}

export type SearchResult = SummarySearchResult | ChatMemoSearchResult;

export interface SummarySearchResult {
  type: "summary";
  summaryIndex: number;
  start: number;
  end: number;
}

export interface ChatMemoSearchResult {
  type: "chatmemo";
  summaryIndex: number;
  memoIndex: number;
}
