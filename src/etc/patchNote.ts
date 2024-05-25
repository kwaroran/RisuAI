export const patchNote = {
    version: "1.106",
    content: 
`
# Update 1.106 (Character Card V3 Update 1 & Highlights)
- Added Character Card V3 Support
 - Added Character Card V3 Export
 - Added Character Card V3 Import
 - Added Multiple character icons support
 - Added {{// }} CBS support
 - Added {{hidden_key:A}} support
 - Added {{reverse:B}} support
 - Added {{comment:B}} support
 - Added nickname field
 - Added creation date field
 - Added last modified date field
 - Added use regex field on lorebook
 - Rewrote lorebook system
 - Added decorators support
    - Added @@activate_only_after support
    - Added @@activate_only_every support
    - Added @@depth support
    - Added @@reverse_depth support
    - Added @@role support
    - Added @@@scan_depth support
    - Added @@is_greeting support
    - Added @@position support
    - Added @@ignore_on_max_context support
    - Added @@additional_keys support
    - Added @@exclude_keys support
    - Added @@activate support
    - Added @@dont_activate support
    - Added @@disable_ui_prompt support
- Deprecated legacy decorators
 - Deprecated @@end, use @@role end instead
 - Deprecated @@assistant, use @@role assistant instead
 - Deprecated @@user, use @@role user instead
 - Deprecated @@system, use @@role system instead
- Added Highlight system
 - Requires Custom Highlight API support in the browser/OS
 - This would enable Highlights of CBS, decorators, and more
- Added Long press to close edit
- Added Long press to remove recursive
- Changed Regex OUT to multi-line input, rather than single line
- Changed many Trigger Script fields to multi-line input, rather than single line
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