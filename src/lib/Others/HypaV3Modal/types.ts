export interface SummaryItemState {
  originalRef: HTMLTextAreaElement;
  translationRef: HTMLTextAreaElement;
  rerolledTranslationRef: HTMLTextAreaElement;
  chatMemoRefs: HTMLButtonElement[];
}

export interface ExpandedMessageState {
  summaryIndex: number;
  selectedChatMemo: string;
  isTranslating: boolean;
  translation: string | null;
  translationRef: HTMLTextAreaElement;
}

export interface SearchState {
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

export const DISPLAY_MODE = {
  All: "All",
  Range: "Range",
  Recent: "Recent",
} as const;

export type DisplayMode = (typeof DISPLAY_MODE)[keyof typeof DISPLAY_MODE];
