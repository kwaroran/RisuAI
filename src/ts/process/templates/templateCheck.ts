import type { Database } from 'src/ts/storage/database'

export function templateCheck(db:Database){

    const temp = db.promptTemplate
    if(!temp){
        return []
    }

    let mainPrompts = 0
    let notePrompts = 0
    let endRanges:number[] = []
    let startRanges:number[] = []
    let hasDescription = false
    let hasLorebook = false
    let reachEnd = false

    for(let i=0;i<temp.length;i++){
        const c = temp[i]
        if(c.type === 'jailbreak' || c.type === 'plain'){
            if(c.type2 === 'globalNote'){
                notePrompts++
            }
            if(c.type2 === 'main'){
                mainPrompts++
            }
        }
        else if(c.type === 'chat'){
            if(c.rangeStart !== 0){
                startRanges.push(c.rangeStart)
            }
            if(c.rangeEnd !== 'end'){
                endRanges.push(c.rangeEnd)
            }
            else{
                reachEnd = true
            }
        }
        else if(c.type === 'description'){
            hasDescription = true
        }
        else if(c.type === 'lorebook'){
            hasLorebook = true
        }
    }

    let warnings:string[] = []

    let unresolvedRanges = startRanges.filter(x => !endRanges.includes(x)).concat(endRanges.filter(x => !startRanges.includes(x)))

    if(mainPrompts === 0){
        warnings.push('No main prompt entry found')
    }
    if(mainPrompts > 1){
        warnings.push('Multiple main prompt entries found, this can result in unexpected behavior')
    }
    if(notePrompts === 0){
        warnings.push('No global notes entry found')
    }
    if(notePrompts > 1){
        warnings.push('Multiple global notes entries found, this can result in unexpected behavior')
    }
    if(!hasDescription){
        warnings.push('No description entry found')
    }
    if(!hasLorebook){
        warnings.push('No lorebook entry found')
    }
    if(!reachEnd){
        warnings.push('No chat entry found with range end set to "Until chat end"')
    }

    if(unresolvedRanges.length > 0){
        warnings.push('Unresolved chat ranges: ' + unresolvedRanges.join(', '))
    }

    return warnings

}