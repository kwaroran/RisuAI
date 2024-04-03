export const patchNote = {
    version: "1.91",
    content: 
`
# Update 1.91.0
- {{#if A}} now trims the whitespace inside the content
- Old {{time}} and {{date}} is renamed to {{message_time}} and {{message_date}}
- Added {{lastcharmessage}} as allias for {{previous_char_chat}}
- Added {{lastusermessage}} as allias for {{previous_user_chat}}
- Added {{newline}} as allias for {{br}}
- Added {{lastmessage}}, which returns the last message sent in the current chat
- Added {{maxcontext}}, which returns the maximum context length
- Added {{lastmessageid}}, which returns the index of the last message sent in the current chat
- Added {{pow::A::B}}, which returns A raised to the power of B
- Added {{pick::A::B...}} which returns a random element from the list, but is consistent across the same message
- Added {{time}}, which returns the current time in the format HH:MM:SS in your timezone
- Added {{date}}, which returns the current date in the format YYYY-MM-DD in your timezone
- Added {{isotime}}, which returns the current time in the format HH:MM:SS in UTC
- Added {{isodate}}, which returns the current date in the format YYYY-MM-DD in UTC
- Added {{#if-pure A}} which is the same as {{#if A}}, but does not trim the whitespace inside the content
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