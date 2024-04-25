export const patchNote = {
    version: "1.100",
    content: 
`
# Update 1.100
- Improved {{datetimeformat:A}}
    - Now it can be also called with {{datetimeformat::A}}, {{date::A}}, {{time::A}}
    - Added \`X\` and \`x\` format for unix timestamp
    - Characters over 300 will be cut off
- Improved {{calc::A}}
    - Now it can be also called with {{? A}}
    - Now it can use \`(\` and \`)\` for calculation
    - Now it can use \`^\` for power
    - Now it can use \`%\` for modulo
    - Now it can use \`|\` for or
    - Now it can use \`&\` for and
    - Now it can use \`<\` for less than
    - Now it can use \`>\` for greater than
    - Now it can use chat variables by prefixing with \`$\` (e.g. \`$a\`)
- Added {{idle_duration}}
    - Old {{idle_duration}} has been renamed to {{message_idle_duration}}
    - {{idle_duration}} will return (current time - last message time)
- Added {{setdefaultvar::A::B}}
    - If A is not defined, it will be set to B
- Added \`/?\` command
- Added \`risu_user\` and \`risu_char\` variable to jinja template
- Added escape key functionality to close the modal
- Added Text Input Size setting
- Added Text Input Text Size setting
- Added Sidebar Size setting
- Added functionality to make a blank first message by using only {{blank}}
- CloneDeep has been replaced with structuredClone
    - This will improve the performance
- Unhandled Error will be automatically alerted now
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