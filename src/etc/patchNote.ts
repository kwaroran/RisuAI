export const patchNote = {
    version: "1.92",
    content: 
`
# Update 1.92.0
- Added {{remaind::A::B}} which will return remainder of A divided by B
- Added {{array_element::A::B}} which will return Bth element of array A
- Added {{array_shift::A}} which will return A without first element
- Added {{array_pop::A}} which will return A without last element
- Added {{array_push::A::B}} which will return A with B pushed at the end
- Added {{array_splice::A::B::C::D}} which will return A with C elements removed starting from Bth element and D elements added at Bth position
- Added {{array::A::B...}} which will return an array with A, B and so on
- Added {{datetimeformat::A}} which will return formatted date time string according to A
- Fixed {{#if}} not working in some cases
`
}

export function getPatchNote(version: string){
    if(patchNote.version.split(".")[1] === version.split(".")[1] && patchNote.version.split(".")[0] === version.split(".")[0]){
        return patchNote
    }
return {
        version: version.split(".")[0] + "." + version.split(".")[1],
        content: ""
    }
}