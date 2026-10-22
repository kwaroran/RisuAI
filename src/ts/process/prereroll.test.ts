import { describe, expect, it } from 'vitest'
import { MAX_MESSAGE_VARIANTS, appendCandidateVariants, attachVariants, collectVariants, switchVariant } from './prereroll'
import type { Message, MessageVariant } from '../storage/database.svelte'

function makeMessage(data:string, variants?:MessageVariant[], variantIndex?:number):Message{
    return {
        role: 'char',
        data,
        variants,
        variantIndex,
    }
}

function virtualOrder(msg:Message){
    return collectVariants(msg).map((v) => v.data)
}

describe('switchVariant', () => {
    it('walks forward to the end and back, keeping the virtual order stable', () => {
        const msg = makeMessage('a', [{data: 'b'}, {data: 'c'}], 0)
        const order = virtualOrder(msg)
        expect(order).toEqual(['a', 'b', 'c'])

        expect(switchVariant(msg, 1)).toBe(true)
        expect(msg.data).toBe('b')
        expect(virtualOrder(msg)).toEqual(order)

        expect(switchVariant(msg, 1)).toBe(true)
        expect(msg.data).toBe('c')
        expect(switchVariant(msg, 1)).toBe(false)
        expect(msg.data).toBe('c')

        expect(switchVariant(msg, -1)).toBe(true)
        expect(msg.data).toBe('b')
        expect(switchVariant(msg, -1)).toBe(true)
        expect(msg.data).toBe('a')
        expect(switchVariant(msg, -1)).toBe(false)
        expect(msg.data).toBe('a')
        expect(virtualOrder(msg)).toEqual(order)
    })

    it('treats undefined variantIndex as active at the end', () => {
        const msg = makeMessage('c', [{data: 'a'}, {data: 'b'}])
        expect(switchVariant(msg, 1)).toBe(false)
        expect(switchVariant(msg, -1)).toBe(true)
        expect(msg.data).toBe('b')
        expect(virtualOrder(msg)).toEqual(['a', 'b', 'c'])
    })

    it('swaps saying and generationInfo but keeps time on the message', () => {
        const msg:Message = {...makeMessage('a', [{data: 'b', time: 1, saying: 'x', generationInfo: {model: 'm1'}}], 0), time: 2, saying: 'y', generationInfo: {model: 'm2'}}
        expect(switchVariant(msg, 1)).toBe(true)
        expect(msg.saying).toBe('x')
        expect(msg.generationInfo).toEqual({model: 'm1'})
        expect(msg.time).toBe(2)
        expect(msg.variants[0]).toEqual({data: 'a', time: 2, saying: 'y', generationInfo: {model: 'm2'}})
    })

    it('returns false without changes when there are no variants or the slot is malformed', () => {
        expect(switchVariant(makeMessage('a'), 1)).toBe(false)
        const malformed = makeMessage('a', [{data: 1 as unknown as string}], 0)
        expect(switchVariant(malformed, 1)).toBe(false)
        expect(malformed.data).toBe('a')
    })
})

describe('collectVariants', () => {
    it('inserts the active message at variantIndex', () => {
        const msg = makeMessage('b', [{data: 'a'}, {data: 'c'}], 1)
        expect(virtualOrder(msg)).toEqual(['a', 'b', 'c'])
    })

    it('returns only the active message when there are no variants', () => {
        expect(virtualOrder(makeMessage('a'))).toEqual(['a'])
    })
})

describe('attachVariants', () => {
    it('attaches pending variants with the active at the end', () => {
        const msg = makeMessage('new')
        attachVariants(msg, [{data: 'a'}, {data: 'b'}])
        expect(virtualOrder(msg)).toEqual(['a', 'b', 'new'])
        expect(msg.variantIndex).toBe(2)
    })

    it('trims the oldest variants over the cap', () => {
        const pending = Array.from({length: MAX_MESSAGE_VARIANTS + 3}, (_, i) => ({data: `v${i}`}))
        const msg = makeMessage('new')
        attachVariants(msg, pending)
        expect(msg.variants.length).toBe(MAX_MESSAGE_VARIANTS)
        expect(msg.variants[0].data).toBe('v3')
        expect(msg.variantIndex).toBe(MAX_MESSAGE_VARIANTS)
    })

    it('keeps candidate variants the message already has after the active', () => {
        const msg = makeMessage('active', [{data: 'c1'}, {data: 'c2'}], 0)
        attachVariants(msg, [{data: 'old1'}, {data: 'old2'}])
        expect(virtualOrder(msg)).toEqual(['old1', 'old2', 'active', 'c1', 'c2'])
        expect(msg.variantIndex).toBe(2)
    })

    it('trims overflow from the pending side when merging with existing candidates', () => {
        const pending = Array.from({length: MAX_MESSAGE_VARIANTS}, (_, i) => ({data: `p${i}`}))
        const msg = makeMessage('active', [{data: 'c1'}, {data: 'c2'}], 0)
        attachVariants(msg, pending)
        expect(msg.variants.length).toBe(MAX_MESSAGE_VARIANTS)
        expect(msg.variants[0].data).toBe('p2')
        expect(msg.variantIndex).toBe(MAX_MESSAGE_VARIANTS - 2)
        expect(virtualOrder(msg).slice(-3)).toEqual(['active', 'c1', 'c2'])
    })

    it('does nothing for an empty pending list', () => {
        const msg = makeMessage('new')
        attachVariants(msg, [])
        expect(msg.variants).toBeUndefined()
    })
})

describe('appendCandidateVariants', () => {
    it('inserts candidates right after the active message, keeping the index', () => {
        const msg = makeMessage('b', [{data: 'a'}], 1)
        appendCandidateVariants(msg, ['c', 'd'])
        expect(virtualOrder(msg)).toEqual(['a', 'b', 'c', 'd'])
        expect(msg.variantIndex).toBe(1)
        expect(switchVariant(msg, 1)).toBe(true)
        expect(msg.data).toBe('c')
    })

    it('trims from the front and adjusts the index over the cap', () => {
        const variants = Array.from({length: MAX_MESSAGE_VARIANTS}, (_, i) => ({data: `v${i}`}))
        const msg = makeMessage('active', variants, MAX_MESSAGE_VARIANTS)
        appendCandidateVariants(msg, ['x', 'y'])
        expect(msg.variants.length).toBe(MAX_MESSAGE_VARIANTS)
        expect(msg.variants[0].data).toBe('v2')
        expect(msg.variantIndex).toBe(MAX_MESSAGE_VARIANTS - 2)
        expect(virtualOrder(msg).slice(-3)).toEqual(['active', 'x', 'y'])
    })

    it('does nothing for empty extras', () => {
        const msg = makeMessage('a')
        appendCandidateVariants(msg, [])
        expect(msg.variants).toBeUndefined()
    })
})
