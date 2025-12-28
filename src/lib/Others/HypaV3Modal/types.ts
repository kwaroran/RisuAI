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

export interface BulkResummaryState {
    isProcessing: boolean;
    result: string | null;
    selectedIndices: number[];
    mergedChatMemos: string[];
    isTranslating: boolean;
    translation: string | null;
}

// Category Management Types
export interface Category {
    id: string;
    name: string;
}

export interface CategoryManagerState {
    isOpen: boolean;
    editingCategory: Category | null;
    selectedCategoryFilter: string;
}

// Tag Management Types
export interface TagManagerState {
    isOpen: boolean;
    currentSummaryIndex: number;
    editingTag: string;
    editingTagIndex: number;
}

// Bulk Edit Types
export interface BulkEditState {
    isEnabled: boolean;
    selectedSummaries: Set<number>;
    selectedCategory: string;
    bulkSelectInput: string;
}

// Filter States
export interface FilterState {
    showImportantOnly: boolean;
    selectedCategoryFilter: string;
    isManualImportantToggle: boolean;
}

// UI States
export interface UIState {
    collapsedSummaries: Set<number>;
    dropdownOpen: boolean;
}

export const DISPLAY_MODE = {
  All: "All",
  Range: "Range",
  Recent: "Recent",
} as const;

export type DisplayMode = (typeof DISPLAY_MODE)[keyof typeof DISPLAY_MODE];
