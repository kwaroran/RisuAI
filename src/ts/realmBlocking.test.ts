import { describe, expect, it } from "vitest"
import {
    addBlockedRealmCreator,
    filterBlockedRealmCards,
    isRealmCreatorBlocked,
    removeBlockedRealmCreator,
} from "./realmBlocking"

describe("RisuRealm creator blocking", () => {
    const blockedCreators = [{ id: "creator-1", name: "Creator One" }]

    it("matches creators by ID", () => {
        expect(isRealmCreatorBlocked(blockedCreators, "creator-1")).toBe(true)
        expect(isRealmCreatorBlocked(blockedCreators, "creator-2")).toBe(false)
        expect(isRealmCreatorBlocked(blockedCreators)).toBe(false)
    })

    it("adds a creator without creating duplicate entries", () => {
        const added = addBlockedRealmCreator(blockedCreators, { id: "creator-2", name: "Creator Two" })
        const duplicate = addBlockedRealmCreator(added, { id: "creator-2", name: "Renamed Creator" })

        expect(added).toEqual([
            ...blockedCreators,
            { id: "creator-2", name: "Creator Two" },
        ])
        expect(duplicate).toBe(added)
    })

    it("ignores a creator without an ID", () => {
        expect(addBlockedRealmCreator(blockedCreators, { id: "", name: "Unknown" })).toBe(blockedCreators)
    })

    it("removes a creator by ID", () => {
        expect(removeBlockedRealmCreator(blockedCreators, "creator-1")).toEqual([])
    })

    it("filters all cards from blocked creators and preserves cards without creator metadata", () => {
        const cards = [
            { id: "card-1", creator: "creator-1" },
            { id: "card-2", creator: "creator-2" },
            { id: "legacy-card" },
        ]

        expect(filterBlockedRealmCards(cards, blockedCreators)).toEqual([
            { id: "card-2", creator: "creator-2" },
            { id: "legacy-card" },
        ])
    })
})
