<script lang="ts">
    import { CheckIcon, XIcon } from '@lucide/svelte';
    import { createEventDispatcher, onDestroy } from 'svelte';
    import { DBState } from 'src/ts/stores.svelte';
    import { language } from 'src/lang';
    import { 
        findAllOriginalRangesFromHtml,
        findAllOriginalRangesFromText,
        replaceRange,
        EDITABLE_BLOCK_SELECTORS,
        type RangeResult,
        type RangeResultWithContext
    } from 'src/ts/parser/partialEdit';

    interface Props {
        messageData: string;
        chatIndex: number;
        bodyRoot: HTMLElement | null;
        blockEditEnabled?: boolean;
        dragEditEnabled?: boolean;
        translatedView?: boolean;
        getTranslationEditContext?: () => Promise<{ key: string; data: string } | null>;
    }

    let {
        messageData = $bindable(''),
        chatIndex,
        bodyRoot,
        blockEditEnabled = false,
        dragEditEnabled = false,
        translatedView = false,
        getTranslationEditContext,
    }: Props = $props();

    const dispatch = createEventDispatcher<{
        save: { newData: string; target: 'original' | 'translation'; translationKey?: string };
    }>();

    // Min drag selection length
    const MIN_DRAG_SELECTION_LENGTH = 5;

    let isEditing = $state(false);
    let editText = $state('');
    let textareaRef: HTMLTextAreaElement | null = $state(null);

    let isConfirmingDelete = $state(false);

    // Unified matching state: tracks both edit and delete operations
    type MatchingMode = 'edit' | 'delete' | null;
    type PartialEditTarget = 'original' | 'translation';
    type MatchingState = {
        mode: MatchingMode;
        targetElement: HTMLElement | null;
        originalHTML: string;
        foundMatches: RangeResultWithContext[];
        selectedRange: RangeResult | null;
        sourceType: PartialEditTarget;
        sourceData: string;
        translationKey: string | null;
    };

    function createMatchingState(): MatchingState {
        return {
            mode: null,
            targetElement: null,
            originalHTML: '',
            foundMatches: [],
            selectedRange: null,
            sourceType: 'original',
            sourceData: messageData,
            translationKey: null,
        };
    }

    let matchingState = $state<MatchingState>(createMatchingState());
    let matchingRequestId = 0;

    function resetMatchingState() {
        matchingRequestId += 1;
        matchingState = createMatchingState();
    }

    let showMatchFailedModal = $state(false);

    const SELECTOR = EDITABLE_BLOCK_SELECTORS.join(', ');

    // Block edit state
    let blockButtonWrapper: HTMLDivElement | null = null;
    let currentHoveredBlock: HTMLElement | null = null;

    // Drag edit state
    let dragButtonWrapper: HTMLDivElement | null = null;
    let currentDragSelectedText: string = '';

    let isInViewport = $state(false);
    let isBlockActive = $derived(blockEditEnabled && isInViewport);
    let isDragActive = $derived(dragEditEnabled && isInViewport);

    // Check if element has text content (excluding buttons)
    function hasTextContent(el: HTMLElement): boolean {
        const clone = el.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('button').forEach(btn => btn.remove());
        return !!clone.textContent?.trim();
    }

    // Create edit/delete button pair
    function createButton(
        className: string,
        onEdit: () => void,
        onDelete: () => void,
        onMouseLeave?: (e: MouseEvent) => void,
    ): HTMLDivElement {
        const wrapper = document.createElement('div');
        wrapper.className = className;
        wrapper.innerHTML = `
            <button type="button" class="partial-edit-btn partial-edit-btn-edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                    <path d="m15 5 4 4"/>
                </svg>
            </button>
            <button type="button" class="partial-edit-btn partial-edit-btn-delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
            </button>
        `;

        const editBtn = wrapper.querySelector('.partial-edit-btn-edit')!;
        editBtn.setAttribute('title', language.partialEdit.editButtonTooltip);
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            onEdit();
        });

        const deleteBtn = wrapper.querySelector('.partial-edit-btn-delete')!;
        deleteBtn.setAttribute('title', language.partialEdit.deleteButtonTooltip);
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete();
        });

        if (onMouseLeave) {
            wrapper.addEventListener('mouseleave', onMouseLeave);
        }

        return wrapper;
    }

    // Show/hide block edit button
    function showBlockButton(block: HTMLElement) {
        if (currentHoveredBlock === block && blockButtonWrapper?.style.display === 'block') return;

        currentHoveredBlock = block;

        if (!blockButtonWrapper) {
            blockButtonWrapper = createButton(
                'partial-edit-btn-wrapper',
                startBlockEdit,
                startBlockDelete,
                (e: MouseEvent) => {
                    const relatedTarget = e.relatedTarget as HTMLElement | null;
                    if (!relatedTarget || !currentHoveredBlock?.contains(relatedTarget)) {
                        hideBlockButton();
                    }
                },
            );
            document.body.appendChild(blockButtonWrapper);
        }

        // Calculate button position (fixed to viewport)
        // Place button at top-left of block
        const rect = block.getBoundingClientRect();
        const buttonHeight = 32;
        blockButtonWrapper.style.position = 'fixed';
        blockButtonWrapper.style.top = `${rect.top - buttonHeight - 4}px`;
        blockButtonWrapper.style.left = `${rect.left}px`;
        blockButtonWrapper.style.display = 'flex';
        blockButtonWrapper.style.gap = '4px';
        blockButtonWrapper.style.zIndex = '1000';
    }

    function hideBlockButton() {
        if (blockButtonWrapper) {
            blockButtonWrapper.style.display = 'none';
        }
        currentHoveredBlock = null;
    }

    // Show/hide drag edit button
    function showDragButton(rect: DOMRect) {
        if (!dragButtonWrapper) {
            dragButtonWrapper = createButton(
                'partial-edit-btn-wrapper partial-edit-drag-btn-wrapper',
                startDragEdit,
                startDragDelete,
            );
            document.body.appendChild(dragButtonWrapper);
        }

        // 72px: 2 buttons (32px*2) + gap(4px) + margin
        const buttonTotalWidth = 72;
        const centerX = (rect.left + rect.right) / 2;

        dragButtonWrapper.style.position = 'fixed';
        dragButtonWrapper.style.top = `${rect.bottom + 4}px`;
        dragButtonWrapper.style.left = `${centerX - buttonTotalWidth / 2}px`;
        dragButtonWrapper.style.display = 'flex';
        dragButtonWrapper.style.gap = '4px';
        dragButtonWrapper.style.zIndex = '1000';
    }

    function hideDragButton() {
        if (dragButtonWrapper) {
            dragButtonWrapper.style.display = 'none';
        }
        currentDragSelectedText = '';
    }

    async function getTranslationContextIfNeeded() {
        if (!translatedView || !getTranslationEditContext) {
            return null;
        }

        return await getTranslationEditContext();
    }

    async function findAndProcessMatches(
        mode: MatchingMode,
        elementOrText: HTMLElement | string,
        proceedCallback: (match: RangeResultWithContext) => void
    ) {
        if (!elementOrText || !messageData) return;

        const requestId = ++matchingRequestId;

        // Set matching options based on mode
        const options = mode === 'edit' 
            ? { extendToEOL: false, snapStartToPrevEOL: false }
            : { extendToEOL: true, snapStartToPrevEOL: true };

        const translationContext = await getTranslationContextIfNeeded();
        if (requestId !== matchingRequestId) return;

        const sourceType: PartialEditTarget = translationContext ? 'translation' : 'original';
        const sourceData = translationContext?.data ?? messageData;
        const nextState = createMatchingState();
        nextState.sourceType = sourceType;
        nextState.sourceData = sourceData;
        nextState.translationKey = translationContext?.key ?? null;

        // Determine if matching from HTML element or text
        if (typeof elementOrText === 'string') {
            nextState.foundMatches = findAllOriginalRangesFromText(sourceData, elementOrText, options);
        } else {
            nextState.targetElement = elementOrText;
            nextState.originalHTML = elementOrText.innerHTML;
            nextState.foundMatches = findAllOriginalRangesFromHtml(sourceData, elementOrText, options);
        }

        matchingState = nextState;

        if (nextState.foundMatches.length === 0) {
            showMatchFailedModal = true;
            return;
        }

        // Filter high-confidence matches
        const highConfidenceMatches = nextState.foundMatches.filter(m => m.confidence >= 0.95);

        if (highConfidenceMatches.length === 1) {
            proceedCallback(highConfidenceMatches[0]);
        } else if (nextState.foundMatches.length === 1) {
            proceedCallback(nextState.foundMatches[0]);
        } else {
            matchingState.mode = mode;
        }

        hideBlockButton();
        hideDragButton();
    }

    // Start block edit/delete
    function startBlockEdit() {
        if (!currentHoveredBlock) return;
        findAndProcessMatches('edit', currentHoveredBlock, proceedWithEdit);
    }

    function startBlockDelete() {
        if (!currentHoveredBlock) return;
        findAndProcessMatches('delete', currentHoveredBlock, proceedWithDelete);
    }

    // Start drag edit/delete
    function startDragEdit() {
        if (!currentDragSelectedText) return;
        findAndProcessMatches('edit', currentDragSelectedText, proceedWithEdit);
    }

    function startDragDelete() {
        if (!currentDragSelectedText) return;
        findAndProcessMatches('delete', currentDragSelectedText, proceedWithDelete);
    }

    // Proceed with edit/delete after match found
    function proceedWithEdit(match: RangeResultWithContext) {
        matchingState.selectedRange = match;
        matchingState.mode = null;
        editText = matchingState.sourceData.slice(match.start, match.end);
        isEditing = true;

        // Focus textarea on next tick
        setTimeout(() => {
            if (textareaRef) {
                textareaRef.focus();
                adjustHeight();
                setTimeout(() => {
                    const buttonsEl = textareaRef.closest('.partial-edit-modal')?.querySelector('.partial-edit-buttons');
                    if (buttonsEl) {
                        (buttonsEl as HTMLElement).scrollIntoView({ behavior: 'instant', block: 'nearest' });
                    }
                }, 200);
            }
        }, 10);
    }

    // Select match from list
    function selectMatchAtIndex(index: number) {
        const match = matchingState.foundMatches[index];
        if (!match) return;

        if (matchingState.mode === 'edit') {
            proceedWithEdit(match);
        } else if (matchingState.mode === 'delete') {
            proceedWithDelete(match);
        }
    }

    // Cancel match selection (restore HTML if in edit mode)
    function cancelMatchSelection() {
        if (matchingState.mode === 'edit' && matchingState.targetElement && matchingState.originalHTML) {
            matchingState.targetElement.innerHTML = matchingState.originalHTML;
        }

        resetMatchingState();
    }

    // Save edited text
    function handleSave() {
        if (!matchingState.selectedRange) return;

        const newData = replaceRange(matchingState.sourceData, matchingState.selectedRange, editText);
        dispatch('save', {
            newData,
            target: matchingState.sourceType,
            translationKey: matchingState.translationKey ?? undefined,
        });

        closeEdit();
    }

    // Cancel editing
    function handleCancel() {
        if (matchingState.targetElement && matchingState.originalHTML) {
            matchingState.targetElement.innerHTML = matchingState.originalHTML;
        }
        closeEdit();
    }

    // Close edit mode
    function closeEdit() {
        isEditing = false;
        editText = '';
        resetMatchingState();
    }

    // Proceed with delete after match selected
    function proceedWithDelete(match: RangeResultWithContext) {
        matchingState.selectedRange = match;
        matchingState.mode = null;
        isConfirmingDelete = true;
    }

    // Confirm deletion
    function handleConfirmDelete() {
        if (!matchingState.selectedRange) return;

        let newData = replaceRange(matchingState.sourceData, matchingState.selectedRange, '');
        newData = newData.replace(/\n{3,}/g, '\n\n').trim();

        dispatch('save', {
            newData,
            target: matchingState.sourceType,
            translationKey: matchingState.translationKey ?? undefined,
        });
        closeDeleteConfirm();
    }

    // Cancel deletion
    function handleCancelDelete() {
        closeDeleteConfirm();
    }

    // Close delete confirmation
    function closeDeleteConfirm() {
        isConfirmingDelete = false;
        resetMatchingState();
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            handleCancel();
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleSave();
        }
    }

    // Auto-adjust textarea height
    function adjustHeight() {
        if (textareaRef) {
            textareaRef.style.height = 'auto';
            textareaRef.style.height = Math.max(60, textareaRef.scrollHeight) + 'px';
        }
    }

    // Check if mouse is over block button
    function isMouseOnBlockButton(mouseX: number, mouseY: number): boolean {
        if (!blockButtonWrapper || blockButtonWrapper.style.display === 'none') return false;
        const rect = blockButtonWrapper.getBoundingClientRect();
        return mouseX >= rect.left && mouseX <= rect.right &&
               mouseY >= rect.top && mouseY <= rect.bottom;
    }

    // Check if mouse is in extended button zone above block
    function isMouseInButtonZone(mouseX: number, mouseY: number, block: HTMLElement): boolean {
        const rect = block.getBoundingClientRect();
        const buttonHeight = 32;
        const gap = 4;
        const extendedTop = rect.top - buttonHeight - gap - 8;
        
        return mouseX >= rect.left && mouseX <= rect.right &&
               mouseY >= extendedTop && mouseY < rect.top;
    }

    // Viewport detection (enable block/drag edit when in view)
    $effect(() => {
        if (!bodyRoot || (!blockEditEnabled && !dragEditEnabled)) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                isInViewport = entry.isIntersecting;
                if (!entry.isIntersecting) {
                    hideBlockButton();
                    hideDragButton();
                }
            },
            {
                threshold: [0, 0.1, 0.5, 1.0],
                rootMargin: '300px',
            }
        );

        observer.observe(bodyRoot);

        return () => {
            observer.disconnect();
            isInViewport = false;
        };
    });

    // Block hover detection (using elementFromPoint for precise detection)
    $effect(() => {
        if (!bodyRoot || !isBlockActive) return;

        let lastMouseX = 0;
        let lastMouseY = 0;
        let rafId: number | null = null;

        const handleMove = (e: MouseEvent) => {
            if (isEditing) return;
            
            const sel = window.getSelection();
            if (sel && !sel.isCollapsed) {
                hideBlockButton();
                return;
            }
            
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;

            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
                rafId = null;
                
                if (isMouseOnBlockButton(lastMouseX, lastMouseY)) {
                    return;
                }

                if (currentHoveredBlock) {
                    if (isMouseInButtonZone(lastMouseX, lastMouseY, currentHoveredBlock)) {
                        return;
                    }
                }

                const elementAtPoint = document.elementFromPoint(lastMouseX, lastMouseY);
                if (elementAtPoint) {
                    const block = elementAtPoint.closest(SELECTOR) as HTMLElement | null;
                    if (block && block !== bodyRoot && bodyRoot.contains(block) && hasTextContent(block)) {
                        showBlockButton(block);
                        return;
                    }
                }

                hideBlockButton();
            });
        };

        // mouseleave handler
        const handleLeave = (e: MouseEvent) => {
            if (isEditing) return;
            
            const relatedTarget = e.relatedTarget as HTMLElement | null;
            
            if (relatedTarget && blockButtonWrapper?.contains(relatedTarget)) {
                return;
            }
            
            hideBlockButton();
        };

        const handleScroll = () => {
            if (isEditing) return;
            hideBlockButton();
        };

        // Listen at document level to include button area
        document.addEventListener('mousemove', handleMove);
        bodyRoot.addEventListener('mouseleave', handleLeave);
        document.addEventListener('scroll', handleScroll, true);

        return () => {
            document.removeEventListener('mousemove', handleMove);
            bodyRoot.removeEventListener('mouseleave', handleLeave);
            document.removeEventListener('scroll', handleScroll, true);
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
        };
    });

    // Drag selection detection
    $effect(() => {
        if (!bodyRoot || !isDragActive) return;

        let debounceTimer: ReturnType<typeof setTimeout> | null = null;

        const handleSelectionChange = () => {
            if (isEditing || isConfirmingDelete || matchingState.mode) return;

            // Debounce: wait for selection to stabilize
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const sel = window.getSelection();
                if (!sel || sel.isCollapsed || !sel.toString().trim()) {
                    hideDragButton();
                    return;
                }

                // Check if selection is within bodyRoot
                const range = sel.getRangeAt(0);
                const ancestor = range.commonAncestorContainer;
                const ancestorEl = ancestor.nodeType === Node.ELEMENT_NODE
                    ? ancestor as HTMLElement
                    : ancestor.parentElement;

                if (!ancestorEl || !bodyRoot.contains(ancestorEl)) {
                    hideDragButton();
                    return;
                }

                // Position button based on selection bounds
                const rect = range.getBoundingClientRect();
                if (rect.width === 0 && rect.height === 0) {
                    hideDragButton();
                    return;
                }

                // Check selection text length
                const selectedText = sel.toString();
                if (selectedText.length < MIN_DRAG_SELECTION_LENGTH) {
                    hideDragButton();
                    return;
                }

                // Save selected text and show button
                currentDragSelectedText = selectedText;
                showDragButton(rect);
            }, 150);
        };

        const handleDragScroll = () => {
            if (isEditing) return;
            hideDragButton();
        };

        const handleMouseDown = (e: MouseEvent) => {
            if (isEditing || isConfirmingDelete || matchingState.mode) return;
            if (dragButtonWrapper && dragButtonWrapper.contains(e.target as Node)) return;
            hideDragButton();
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        document.addEventListener('scroll', handleDragScroll, true);
        document.addEventListener('mousedown', handleMouseDown);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            document.removeEventListener('scroll', handleDragScroll, true);
            document.removeEventListener('mousedown', handleMouseDown);
            if (debounceTimer) clearTimeout(debounceTimer);
        };
    });

    // Cleanup on component unmount
    onDestroy(() => {
        matchingRequestId += 1;
        if (blockButtonWrapper) {
            blockButtonWrapper.remove();
            blockButtonWrapper = null;
        }
        if (dragButtonWrapper) {
            dragButtonWrapper.remove();
            dragButtonWrapper = null;
        }
    });
</script>

{#snippet MatchSelectionModal(mode: MatchingMode, matches: RangeResultWithContext[], title: string)}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="partial-edit-overlay" onclick={(e) => { if (e.target === e.currentTarget) cancelMatchSelection(); }}>
        <div class="partial-match-selection-modal">
            <div class="match-selection-header">
                <span class="match-selection-title">{title}</span>
                <span class="match-count">{matches.length} {language.partialEdit.matchesFound}</span>
            </div>
            <div class="match-list">
                {#each matches as match, i}
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <div class="match-item" onclick={() => selectMatchAtIndex(i)}>
                        <div class="match-meta">
                            <span class="match-line">{language.partialEdit.lineNumber(match.lineNumber)}</span>
                            <span class="match-confidence" class:high-confidence={match.confidence >= 0.95} class:medium-confidence={match.confidence >= 0.7 && match.confidence < 0.95} class:low-confidence={match.confidence < 0.7}>
                                {(match.confidence * 100).toFixed(0)}%
                            </span>
                            <span class="match-method">{match.method}</span>
                        </div>
                        {#if match.contextBefore}
                            <div class="match-context-before">{match.contextBefore}</div>
                        {/if}
                        <div class="match-text">
                            {matchingState.sourceData.slice(match.start, match.end).slice(0, 150)}{matchingState.sourceData.slice(match.start, match.end).length > 150 ? '...' : ''}
                        </div>
                        {#if match.contextAfter}
                            <div class="match-context-after">{match.contextAfter}</div>
                        {/if}
                    </div>
                {/each}
            </div>
            <div class="partial-edit-buttons">
                <button
                    type="button"
                    class="partial-edit-cancel-btn"
                    onclick={cancelMatchSelection}
                >
                    <XIcon size={14} />
                    <span>{language.cancel}</span>
                </button>
            </div>
        </div>
    </div>
{/snippet}

<!-- Match failed modal -->
{#if showMatchFailedModal}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="partial-edit-overlay" onclick={(e) => { if (e.target === e.currentTarget) showMatchFailedModal = false; }}>
        <div class="partial-match-failed-modal">
            <div class="partial-match-failed-header">
                <span class="partial-match-failed-title">{language.partialEdit.matchFailedTitle}</span>
            </div>
            <p class="partial-match-failed-message">{language.partialEdit.matchFailedMessage}</p>
            <div class="partial-edit-buttons">
                <button
                    type="button"
                    class="partial-edit-save-btn"
                    onclick={() => showMatchFailedModal = false}
                >
                    <CheckIcon size={14} />
                    <span>{language.confirm}</span>
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Delete confirmation modal -->
{#if isConfirmingDelete}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="partial-edit-overlay" onclick={(e) => { if (e.target === e.currentTarget) handleCancelDelete(); }}>
        <div class="partial-delete-modal">
            <div class="partial-delete-header">
                <span class="partial-delete-title">{language.partialEdit.deleteModalTitle}</span>
                <div class="partial-match-meta">
                    <span class="partial-match-hint">
                        {language.partialEdit.matchFound(matchingState.selectedRange.method)}
                    </span>
                    <span class="partial-match-confidence" class:low-confidence={matchingState.selectedRange.confidence < 0.7}>
                        {(matchingState.selectedRange.confidence * 100).toFixed(0)}%
                    </span>
                </div>
            </div>
            <p class="partial-delete-message">{language.partialEdit.deleteConfirmMessage}</p>
            <div class="partial-delete-preview">
                {matchingState.selectedRange ? matchingState.sourceData.slice(matchingState.selectedRange.start, matchingState.selectedRange.end).slice(0, 200) : ''}{matchingState.selectedRange && matchingState.sourceData.slice(matchingState.selectedRange.start, matchingState.selectedRange.end).length > 200 ? '...' : ''}
            </div>
            <div class="partial-edit-buttons">
                <button
                    type="button"
                    class="partial-delete-confirm-btn"
                    onclick={handleConfirmDelete}
                >
                    <CheckIcon size={14} />
                    <span>{language.partialEdit.deleteYes}</span>
                </button>
                <button
                    type="button"
                    class="partial-edit-cancel-btn"
                    onclick={handleCancelDelete}
                >
                    <XIcon size={14} />
                    <span>{language.partialEdit.deleteNo}</span>
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Match selection modal (shared for edit/delete) -->
{#if matchingState.mode === 'edit'}
    {@render MatchSelectionModal('edit', matchingState.foundMatches, language.partialEdit.selectMatch)}
{:else if matchingState.mode === 'delete'}
    {@render MatchSelectionModal('delete', matchingState.foundMatches, language.partialEdit.selectDeleteMatch)}
{/if}

<!-- Edit modal (shown only during edit) -->
{#if isEditing}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="partial-edit-overlay" onclick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}>
        <div class="partial-edit-modal">
            <div class="partial-edit-header">
                <span class="partial-edit-title">{language.partialEdit.editModalTitle}</span>
                <div class="partial-match-meta">
                    <span class="partial-match-hint">
                        {language.partialEdit.matchFound(matchingState.selectedRange.method)}
                    </span>
                    <span class="partial-match-confidence" class:low-confidence={matchingState.selectedRange.confidence < 0.7}>
                        {(matchingState.selectedRange.confidence * 100).toFixed(0)}%
                    </span>
                </div>
            </div>
            <textarea
                bind:this={textareaRef}
                bind:value={editText}
                class="partial-edit-textarea"
                onkeydown={handleKeydown}
                oninput={adjustHeight}
                style:font-size="{0.875 * (DBState.db.zoomsize / 100)}rem"
                style:line-height="{(DBState.db.lineHeight ?? 1.25) * (DBState.db.zoomsize / 100)}rem"
            ></textarea>
            <div class="partial-edit-buttons">
                <button
                    type="button"
                    class="partial-edit-save-btn"
                    onclick={handleSave}
                    title="{language.partialEdit.saveShortcut}"
                >
                    <CheckIcon size={14} />
                    <span>{language.partialEdit.save}</span>
                </button>
                <button
                    type="button"
                    class="partial-edit-cancel-btn"
                    onclick={handleCancel}
                    title="{language.partialEdit.cancelShortcut}"
                >
                    <XIcon size={14} />
                    <span>{language.partialEdit.cancel}</span>
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    :global(.partial-edit-btn-wrapper) {
        display: none;
    }

    :global(.partial-edit-btn) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        padding: 8px;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: 6px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        transition: all 0.15s ease;
        color: #666;
    }

    :global(.partial-edit-btn-edit:hover) {
        background: #e0f2fe;
        border-color: #3b82f6;
        color: #3b82f6;
    }

    :global(.partial-edit-btn-delete:hover) {
        background: #fee2e2;
        border-color: #ef4444;
        color: #ef4444;
    }

    .partial-match-failed-modal {
        background: var(--risu-theme-bgcolor, #fff);
        border-radius: 12px;
        padding: 20px;
        width: 50vw;
        max-width: 500px;
        min-width: 320px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .partial-match-failed-header {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .partial-match-failed-title {
        font-weight: 600;
        font-size: 16px;
        color: var(--risu-theme-textcolor, #000);
    }

    .partial-match-failed-message {
        font-size: 14px;
        color: var(--risu-theme-textcolor, #000);
        margin: 0;
        line-height: 1.5;
    }

    .partial-delete-modal {
        background: var(--risu-theme-bgcolor, #fff);
        border-radius: 12px;
        padding: 20px;
        width: 50vw;
        max-width: 1600px;
        min-width: 400px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .partial-delete-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .partial-delete-title {
        font-weight: 600;
        font-size: 16px;
        color: var(--risu-theme-textcolor, #000);
    }

    .partial-delete-message {
        font-size: 14px;
        color: var(--risu-theme-textcolor, #000);
        margin: 0;
    }

    .partial-delete-preview {
        padding: 12px;
        background: var(--risu-theme-darkbg, #f5f5f5);
        border-radius: 8px;
        font-size: 13px;
        color: var(--risu-theme-textcolor, #000);
        max-height: 100px;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .partial-delete-confirm-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        background: #ef4444;
        color: white;
    }

    .partial-delete-confirm-btn:hover {
        background: #dc2626;
    }

    .partial-edit-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    }

    .partial-edit-modal {
        background: var(--risu-theme-bgcolor, #fff);
        border-radius: 12px;
        padding: 20px;
        width: 50vw;
        max-width: 1600px;
        min-width: 400px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        gap: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .partial-edit-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .partial-edit-title {
        font-weight: 600;
        font-size: 16px;
        color: var(--risu-theme-textcolor, #000);
    }

    .partial-match-meta {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .partial-match-hint {
        font-size: 12px;
        color: var(--risu-theme-textcolor, #000);
    }

    .partial-match-confidence {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
        background: #10b981;
        color: white;
    }

    .partial-match-confidence.low-confidence {
        background: #f59e0b;
    }

    .partial-edit-textarea {
        width: 100%;
        min-height: 120px;
        max-height: 50vh;
        padding: 12px;
        border: 1px solid var(--risu-theme-darkborderc, #ddd);
        border-radius: 8px;
        background: var(--risu-theme-darkbg, #f5f5f5);
        color: var(--risu-theme-textcolor, #000);
        font-family: inherit;
        resize: vertical;
        box-sizing: border-box;
    }

    .partial-edit-textarea:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }

    .partial-edit-buttons {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
    }

    .partial-edit-save-btn,
    .partial-edit-cancel-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .partial-edit-save-btn {
        background: #3b82f6;
        color: white;
    }

    .partial-edit-save-btn:hover {
        background: #2563eb;
    }

    .partial-edit-cancel-btn {
        background: #6b7280;
        color: white;
    }

    .partial-edit-cancel-btn:hover {
        background: #4b5563;
    }

    /* Match Selection Modal */
    .partial-match-selection-modal {
        background: var(--risu-theme-bgcolor, #fff);
        border-radius: 12px;
        padding: 20px;
        width: 50vw;
        max-width: 1200px;
        min-width: 400px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .match-selection-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--risu-theme-darkborderc, #ddd);
    }

    .match-selection-title {
        font-weight: 600;
        font-size: 16px;
        color: var(--risu-theme-textcolor, #000);
    }

    .match-count {
        font-size: 13px;
        font-weight: 500;
        padding: 4px 10px;
        border-radius: 12px;
        background: var(--risu-theme-darkbg, #f5f5f5);
        color: var(--risu-theme-textcolor, #000);
    }

    .match-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        overflow-y: auto;
        max-height: calc(80vh - 160px);
        padding: 4px;
    }

    .match-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 16px;
        border: 1px solid var(--risu-theme-darkborderc, #ddd);
        border-radius: 8px;
        background: var(--risu-theme-darkbg, #f9f9f9);
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .match-item:hover {
        background: var(--risu-theme-bgcolor, #fff);
        border-color: #3b82f6;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
        transform: translateY(-1px);
    }

    .match-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .match-line {
        font-size: 12px;
        font-weight: 500;
        color: var(--risu-theme-textcolor, #000);
        background: var(--risu-theme-bgcolor, #fff);
        padding: 2px 8px;
        border-radius: 4px;
    }

    .match-confidence {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 4px;
        color: white;
    }

    .match-confidence.high-confidence {
        background: #10b981;
    }

    .match-confidence.medium-confidence {
        background: #3b82f6;
    }

    .match-confidence.low-confidence {
        background: #f59e0b;
    }

    .match-method {
        font-size: 11px;
        font-weight: 500;
        padding: 2px 6px;
        border-radius: 4px;
        background: var(--risu-theme-bgcolor, #fff);
        color: var(--risu-theme-textcolor, #000);
        font-family: monospace;
    }

    .match-context-before,
    .match-context-after {
        font-size: 12px;
        color: var(--risu-theme-textcolor, #000);
        padding: 8px 12px;
        background: var(--risu-theme-bgcolor, #fff);
        border-radius: 6px;
        border-left: 3px solid var(--risu-theme-darkborderc, #ddd);
        line-height: 1.5;
        font-style: italic;
        white-space: pre-line;
    }

    .match-text {
        font-size: 13px;
        color: var(--risu-theme-textcolor, #000);
        padding: 10px 12px;
        background: var(--risu-theme-bgcolor, #fff);
        border-radius: 6px;
        border-left: 3px solid #3b82f6;
        line-height: 1.5;
        font-weight: 500;
        white-space: pre-line;
    }
</style>
