import type { BlockedRealmCreator } from "./storage/database.svelte"

type RealmCreatorData = {
    creator?: string
}

export function isRealmCreatorBlocked(blockedCreators: BlockedRealmCreator[], creator?: string): boolean {
    return !!creator && blockedCreators.some((blockedCreator) => blockedCreator.id === creator)
}

export function addBlockedRealmCreator(
    blockedCreators: BlockedRealmCreator[],
    creator: BlockedRealmCreator,
): BlockedRealmCreator[] {
    if (!creator.id || isRealmCreatorBlocked(blockedCreators, creator.id)) {
        return blockedCreators
    }

    return [...blockedCreators, creator]
}

export function removeBlockedRealmCreator(
    blockedCreators: BlockedRealmCreator[],
    creatorId: string,
): BlockedRealmCreator[] {
    return blockedCreators.filter((blockedCreator) => blockedCreator.id !== creatorId)
}

export function filterBlockedRealmCards<T extends RealmCreatorData>(
    cards: T[],
    blockedCreators: BlockedRealmCreator[],
): T[] {
    return cards.filter((card) => !isRealmCreatorBlocked(blockedCreators, card.creator))
}
