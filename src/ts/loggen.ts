// Log Generator by dootaang, GPL3
// Typescript version by Kwaroran


interface templateStyles{
    gradientModern:boolean,
    showBotName:boolean,
    botName:string,
    showTags:boolean,
    tagLayout:{
        content:string,
        border_radius:number,
        font_size:number,
        padding:{
            top:number,
            right:number,
            bottom:number,
            left:number
        },
        text_color:string,
        style:string,
        color:string

    }[]
    showProfile:boolean,
    showProfileImage:boolean,
    widthInput:number,
    heightInput:number,
    frameStyle:string,
    outerBoxColor:string,
    innerBoxColor:string,
    shadowIntensity:number,
    useBoxBorder:boolean,
    boxBorderColor:string,
    boxBorderThickness:number,
    showInnerBox:boolean,
    profileBorderColor:string,
    showProfileShadow:boolean,
    showProfileBorder:boolean,
    botNameColor:string,
    showDivider:boolean,
    dividerThickness:number,
    dividerStyle:string,
    dividerOuterColor:string,
    dividerInnerColor:string,
    dividerSolidColor:string,
    styles:{
        font_family:string,
        text:string,
        font_size_normal:number,
        font_weight_bold:number,
        radius_normal:number,
        radius_large:number,
        spacing_large:number
    }
}

interface LogGenTemplate{
    name:string,
    theme:{
        colors:{
            outer_box:string,
            inner_box:string,
            background:string,
            bot_name:string,
            dialog:string,
            narration:string,
            inner_thoughts:string,
            profile_border:string,
            box_border:string,
            image_border:string,
            divider_outer:string,
            divider_inner:string,
            gradient_start:string,
            gradient_end:string,
            tag_bg?:string,
            tag_text?:string
        },
        tags:{
            color:string,
            text_color:string,
            border_color:string
        }[]
    }
    gradientModern?:boolean,
}

const templates:LogGenTemplate[] = [
    {
        "name": "Modern Blue",
        "theme": {
            "colors": {
                "outer_box": "#1a202c",
                "inner_box": "#2d3748",
                "background": "#2d3748",
                "bot_name": "#90cdf4",
                "dialog": "#f7fafc",
                "narration": "#e2e8f0",
                "inner_thoughts": "#cbd5e0",
                "profile_border": "#4a5568",
                "box_border": "#4a5568",
                "image_border": "#4a5568",
                "divider_outer": "#4a5568",
                "divider_inner": "#2d3748",
                "gradient_start": "#1a202c",
                "gradient_end": "#2d3748"
            },
            "tags": [
                {"color": "#2c5282", "text_color": "#bee3f8", "border_color": "#2b6cb0"},
                {"color": "#2b6cb0", "text_color": "#bee3f8", "border_color": "#3182ce"},
                {"color": "#3182ce", "text_color": "#ffffff", "border_color": "#4299e1"}
            ]
        }
    },
    {
        "name": "Dark Mode",
        "theme": {
            "colors": {
                "outer_box": "#000000",
                "inner_box": "#1a1a1a",
                "background": "#1a1a1a",
                "bot_name": "#ffffff",
                "dialog": "#ffffff",
                "narration": "#e0e0e0",
                "inner_thoughts": "#c0c0c0",
                "profile_border": "#333333",
                "box_border": "#333333",
                "image_border": "#333333",
                "divider_outer": "#333333",
                "divider_inner": "#1a1a1a",
                "gradient_start": "#000000",
                "gradient_end": "#1a1a1a"
            },
            "tags": [
                {"color": "#262626", "text_color": "#e0e0e0", "border_color": "#333333"},
                {"color": "#333333", "text_color": "#e0e0e0", "border_color": "#404040"},
                {"color": "#404040", "text_color": "#ffffff", "border_color": "#4d4d4d"}
            ]
        }
    },
    {
        "name": "Rose Gold",
        "theme": {
            "colors": {
                "outer_box": "#ffffff",
                "inner_box": "#fff5f5",
                "background": "#fff5f5",
                "bot_name": "#c53030",
                "dialog": "#2d3748",
                "narration": "#4a5568",
                "inner_thoughts": "#718096",
                "profile_border": "#feb2b2",
                "box_border": "#fc8181",
                "image_border": "#feb2b2",
                "divider_outer": "#fc8181",
                "divider_inner": "#ffffff",
                "gradient_start": "#fff5f5",
                "gradient_end": "#fed7d7"
            },
            "tags": [
                {"color": "#fed7d7", "text_color": "#c53030", "border_color": "#feb2b2"},
                {"color": "#feb2b2", "text_color": "#c53030", "border_color": "#fc8181"},
                {"color": "#fc8181", "text_color": "#ffffff", "border_color": "#f56565"}
            ]
        }
    },
    {
        "name": "Mint Green",
        "theme": {
            "colors": {
                "outer_box": "#ffffff",
                "inner_box": "#f0fff4",
                "background": "#f0fff4",
                "bot_name": "#2f855a",
                "dialog": "#2d3748",
                "narration": "#4a5568",
                "inner_thoughts": "#718096",
                "profile_border": "#9ae6b4",
                "box_border": "#68d391",
                "image_border": "#9ae6b4",
                "divider_outer": "#68d391",
                "divider_inner": "#ffffff",
                "gradient_start": "#f0fff4",
                "gradient_end": "#c6f6d5"
            },
            "tags": [
                {"color": "#c6f6d5", "text_color": "#2f855a", "border_color": "#9ae6b4"},
                {"color": "#9ae6b4", "text_color": "#2f855a", "border_color": "#68d391"},
                {"color": "#68d391", "text_color": "#ffffff", "border_color": "#48bb78"}
            ]
        }
    },
    {
        "name": "Modern Purple",
        "theme": {
            "colors": {
                "outer_box": "#ffffff",
                "inner_box": "#f8f5ff",
                "background": "#f8f5ff",
                "bot_name": "#6b46c1",
                "dialog": "#2d3748",
                "narration": "#4a5568",
                "inner_thoughts": "#718096",
                "profile_border": "#d6bcfa",
                "box_border": "#b794f4",
                "image_border": "#d6bcfa",
                "divider_outer": "#b794f4",
                "divider_inner": "#ffffff",
                "gradient_start": "#f8f5ff",
                "gradient_end": "#e9d8fd"
            },
            "tags": [
                {"color": "#e9d8fd", "text_color": "#6b46c1", "border_color": "#d6bcfa"},
                {"color": "#d6bcfa", "text_color": "#6b46c1", "border_color": "#b794f4"},
                {"color": "#b794f4", "text_color": "#ffffff", "border_color": "#9f7aea"}
            ]
        }
    },
    {
        "name": "Ocean Blue",
        "theme": {
            "colors": {
                "outer_box": "#ffffff",
                "inner_box": "#ebf8ff",
                "background": "#ebf8ff",
                "bot_name": "#2c5282",
                "dialog": "#2d3748",
                "narration": "#4a5568",
                "inner_thoughts": "#718096",
                "profile_border": "#90cdf4",
                "box_border": "#63b3ed",
                "image_border": "#90cdf4",
                "divider_outer": "#63b3ed",
                "divider_inner": "#ffffff",
                "gradient_start": "#ebf8ff",
                "gradient_end": "#bee3f8"
            },
            "tags": [
                {"color": "#bee3f8", "text_color": "#2c5282", "border_color": "#90cdf4"},
                {"color": "#90cdf4", "text_color": "#2c5282", "border_color": "#63b3ed"},
                {"color": "#63b3ed", "text_color": "#ffffff", "border_color": "#4299e1"}
            ]
        }
    },
    {
        "name": "Sunset Orange",
        "theme": {
            "colors": {
                "outer_box": "#ffffff",
                "inner_box": "#fffaf0",
                "background": "#fffaf0",
                "bot_name": "#c05621",
                "dialog": "#2d3748",
                "narration": "#4a5568",
                "inner_thoughts": "#718096",
                "profile_border": "#fbd38d",
                "box_border": "#f6ad55",
                "image_border": "#fbd38d",
                "divider_outer": "#f6ad55",
                "divider_inner": "#ffffff",
                "gradient_start": "#fffaf0",
                "gradient_end": "#feebc8"
            },
            "tags": [
                {"color": "#feebc8", "text_color": "#c05621", "border_color": "#fbd38d"},
                {"color": "#fbd38d", "text_color": "#c05621", "border_color": "#f6ad55"},
                {"color": "#f6ad55", "text_color": "#ffffff", "border_color": "#ed8936"}
            ]
        }
    },
    {
        "name": "Mocha Brown",
        "theme": {
            "colors": {
                "outer_box": "#ffffff",
                "inner_box": "#faf5f1",
                "background": "#faf5f1",
                "bot_name": "#7b341e",
                "dialog": "#2d3748",
                "narration": "#4a5568",
                "inner_thoughts": "#718096",
                "profile_border": "#d6bcab",
                "box_border": "#b08b6e",
                "image_border": "#d6bcab",
                "divider_outer": "#b08b6e",
                "divider_inner": "#ffffff",
                "gradient_start": "#faf5f1",
                "gradient_end": "#e8d6cf"
            },
            "tags": [
                {"color": "#e8d6cf", "text_color": "#7b341e", "border_color": "#d6bcab"},
                {"color": "#d6bcab", "text_color": "#7b341e", "border_color": "#b08b6e"},
                {"color": "#b08b6e", "text_color": "#ffffff", "border_color": "#966251"}
            ]
        }
    },
    {
        "name": "Space Gray",
        "theme": {
            "colors": {
                "outer_box": "#1a1a1a",
                "inner_box": "#2d2d2d",
                "background": "#2d2d2d",
                "bot_name": "#e2e2e2",
                "dialog": "#ffffff",
                "narration": "#d1d1d1",
                "inner_thoughts": "#b0b0b0",
                "profile_border": "#404040",
                "box_border": "#404040",
                "image_border": "#404040",
                "divider_outer": "#404040",
                "divider_inner": "#2d2d2d",
                "gradient_start": "#1a1a1a",
                "gradient_end": "#2d2d2d"
            },
            "tags": [
                {"color": "#404040", "text_color": "#e2e2e2", "border_color": "#4a4a4a"},
                {"color": "#4a4a4a", "text_color": "#e2e2e2", "border_color": "#525252"},
                {"color": "#525252", "text_color": "#ffffff", "border_color": "#5a5a5a"}
            ]
        }
    },
    {
        "name": "Gradient Modern",
        "theme": {
            "colors": {
                "outer_box": "#fafafa",
                "inner_box": "#fafafa",
                "background": "#fafafa",
                "bot_name": "#494949",
                "dialog": "#494949",
                "narration": "#666666",
                "inner_thoughts": "#808080",
                "profile_border": "#e3e3e3",
                "box_border": "#e9e9e9",
                "image_border": "#e3e3e3",
                "divider_outer": "#e9e9e9",
                "divider_inner": "#e9e9e9",
                "gradient_start": "#D9D782",
                "gradient_end": "#A9B9D9",
                "tag_bg": "#494949",
                "tag_text": "#d5d5d5"
            },
            "tags": [
                {"color": "#494949", "text_color": "#d5d5d5", "border_color": "#5a5a5a"},
                {"color": "#494949", "text_color": "#d5d5d5", "border_color": "#5a5a5a"},
                {"color": "#494949", "text_color": "#d5d5d5", "border_color": "#5a5a5a"}
            ]
        }
    }
]

function applyTemplate(self:templateStyles, theme:string){
    const themeDict = templates.find((template) => template.name == theme)

    self.gradientModern = themeDict.gradientModern || false
    self.outerBoxColor = themeDict.theme.colors.outer_box
    self.innerBoxColor = themeDict.theme.colors.inner_box
    self.botNameColor = themeDict.theme.colors.bot_name
    self.profileBorderColor = themeDict.theme.colors.profile_border
    self.boxBorderColor = themeDict.theme.colors.box_border
    self.dividerOuterColor = themeDict.theme.colors.divider_outer
    self.dividerInnerColor = themeDict.theme.colors.divider_inner
    self.dividerSolidColor = themeDict.theme.colors.divider_outer
    self.styles.text = themeDict.theme.colors.dialog
    self.tagLayout = []
    for(let i=0; i<themeDict.theme.tags.length; i++){
        let tag = themeDict.theme.tags[i]
        self.tagLayout.push({
            content: "",
            border_radius: 5,
            font_size: 0.8,
            padding: {
                top: 0.5,
                right: 1,
                bottom: 0.5,
                left: 1
            },
            text_color: tag.text_color,
            style: "solid",
            color: tag.color
        })
    }

}

function createDecoration(self:templateStyles, content:string){
    
    let profile_section_html = ''
    if(self.gradientModern){

            let colors = {
                "outer_box": "#fafafa",
                "profile_border": "#e3e3e3",
                "gradient_start": "#D9D782",
                "gradient_end": "#A9B9D9",
                "divider_outer": "#e9e9e9",
                "bot_name": "#ededed",
                "narration": "#494949",
                "tag_bg": "#494949",
                "tag_text": "#d5d5d5"
            }

            let bot_name_html = ""

            if(self.showBotName){
                let bot_name = self.botName.trim() || "봇이름"
                bot_name_html = `
                    <div style="background:linear-gradient(135deg,${colors['gradient_start']},${colors['gradient_end']});
                                background-size:110%;
                                background-position:center;
                                border-radius:20px;
                                padding:10px;
                                line-height:10px;
                                border:solid 10px ${colors['divider_outer']};
                                text-transform:uppercase;
                                letter-spacing:1px;
                                box-shadow:inset 0px 40px 0px rgba(30,30,30,.1);
                                display:flex;
                                width: fit-content;
                                max-width: 200px;
                                float: left;
                                margin-left: 50px;
                                margin-top: 5px;">
                        <span style="text-decoration:none;
                                color:${colors['bot_name']};
                                font-weight:bold;
                                text-shadow:0px 0px 5px rgba(30,30,30,.1)">
                            ${bot_name}
                        </span>
                    </div>`
            }

            let tags_html = ""
                if(self.showTags){
                    let tags = []
                    for(let i = 0; i < self.tagLayout.length; i++){
                        let widget = self.tagLayout[i]
                        let tag_text = widget.content || `태그 ${i+1}`
                        tags.push(tag_text)
                    }

                    if(tags.length > 0){
                        tags_html = `
                            <div style="margin-top: 15px;
                                        float: right;
                                        width: fit-content;
                                        background-color:${colors['tag_bg']};
                                        border-radius:5px 0px 0px 5px;
                                        padding:10px;
                                        line-height:10px;
                                        letter-spacing:2px;
                                        text-transform:uppercase;
                                        color:${colors['tag_text']};
                                        font-size:10px">
                                ${tags.join(' | ')}
                            </div>`
                    }
                }

                let profile_image_html = ""

                if(self.showProfile && self.showProfileImage){
                    let image_url = '' //TODO
                    let width = self.widthInput
                    let height = self.heightInput
                    let frame_style = self.frameStyle

                    let common_style = `
                        max-width: 100%;
                        display: block;
                        margin: 0 auto;
                        box-shadow: 0px 10px 30px rgba(0,0,0,0.1);
                        border: 3px solid ${colors['profile_border']};
                    `

                    let image_style = ""
                    let container_style = ""

                    if(frame_style == "배너"){
                        image_style = `
                            ${common_style}
                            width: 100%;
                            height: auto;
                            border-radius: 15px;
                            object-fit: cover;
                        `
                        container_style = "width: 100%; padding: 0 20px;"
                    }else if(frame_style == "동그라미"){
                        image_style = `
                            ${common_style}
                            width: ${width}px;
                            height: ${width}px;
                            border-radius: 50%;
                            object-fit: cover;
                        `
                        container_style = "width: auto;"
                    }else{
                        image_style = `
                            ${common_style}
                            width: ${width}px;
                            height: ${height}px;
                            border-radius: 10px;
                            object-fit: cover;
                        `
                        container_style = "width: auto;"
                    }

                    profile_image_html = `
                        <div style="text-align: center; 
                                    clear: both; 
                                    ${container_style}
                                    padding-top: 40px;
                                    padding-bottom: 20px;">
                            <img style="${image_style}" 
                                src="${image_url}" 
                                alt="profile" 
                                class="fr-fic fr-dii">
                        </div>
                    `
                }

                return `
                    <p><br></p>
                    <div style="border:solid 2px ${colors['profile_border']};
                                background-color:${colors['outer_box']};
                                border-radius:20px;
                                position:relative;
                                max-width:500px;
                                margin:0px auto;">
                    
                        <div style="height: 85px;margin:-1px -1px 0px -1px">
                            <div style="background:linear-gradient(-45deg,${colors['gradient_start']},${colors['gradient_end']});
                                        background-size:200%;
                                        height:70px;
                                        border-radius:19px 19px 0px 0px">
                                <div style="height:70px;width:100%;border-radius:19px 19px 0px 0px">
                                </div>
                            </div>
                        </div>
                        
                        ${bot_name_html}
                        ${profile_image_html}
                        ${tags_html}
                        
                        
                        <div style="padding: 40px 60px 30px 60px;
                                    line-height:22px;
                                    letter-spacing:.35px;
                                    clear: both;">
                            ${content}
                        </div>
                    </div>
                    <p><br></p>`

    }
    else{
            let box_outer_color = self.outerBoxColor
            let box_inner_color = self.innerBoxColor
            let shadow_value = self.shadowIntensity
    
            let border_style = ""
            if(self.useBoxBorder){
                let border_color = self.boxBorderColor
                let border_thickness = self.boxBorderThickness
                border_style = `border: ${border_thickness}px solid ${border_color};`
            }
    
            let background_color = ""
            let inner_box_style = ""
            if(self.showInnerBox){
                background_color = box_outer_color
                inner_box_style = `
                    font-size:${self.styles.font_size_normal}px;
                    background:${box_inner_color};
                    padding:${self.styles.spacing_large}px;
                    border-radius:${self.styles.radius_normal}px;`
            }
            else{
                background_color = box_inner_color
                inner_box_style = `
                    font-size:${self.styles.font_size_normal}px;
                    padding:0;`
            }

            if(self.showProfile){
                let profile_parts = []
                    if(self.showProfileImage){
                        let profile_border_color = self.profileBorderColor
                        let width = self.widthInput
                        let height = self.heightInput
                        let image_url = '' //TODO
                        
                        let common_style = `
                            max-width:100%;
                            ${self.showProfileShadow ? 'box-shadow:rgba(0,0,0,0.12) 0px 4px 16px;' : ''}
                            ${self.showProfileBorder ? `border:3px solid ${profile_border_color};` : ''}
                        `
                        
                        let profile_style = ""
                        let container_style = ""

                        if(self.frameStyle == "배너"){
                            profile_style = `${common_style} border-radius:12px;`
                            container_style = "width:100%;"
                        }else if(self.frameStyle == "동그라미"){
                            profile_style = `${common_style} width:${width}px; height:${width}px; border-radius:50%; object-fit:cover;`
                            container_style = "width:auto;"
                        }else{
                            profile_style = `${common_style} width:${width}px; height:${height}px; border-radius:8px; object-fit:cover;`
                            container_style = "width:auto;"
                        }
                        
                        let profile_html = `
                        <div style="margin-bottom:1rem; text-align:center; ${container_style}">
                            <img style="${profile_style}" 
                                src="${image_url}" 
                                alt="profile" 
                                class="fr-fic fr-dii">
                        </div>
                        `
                        profile_parts.push(profile_html)
                    }
                    if(self.showBotName){
                        let bot_name = self.botName || "봇 이름"
                        let bot_name_color = self.botNameColor
                        let bot_name_html = `
                            <h3 style="color:${bot_name_color};font-weight:${self.styles.font_weight_bold};">${bot_name}</h3>
                        `
                        profile_parts.push(bot_name_html)
                    }
                    if(self.showTags){
                        let tags_html = []
                        for(let i = 0; i < self.tagLayout.length; i++){
                            let widget = self.tagLayout[i]
                            if(widget){
                                let style_dict = widget
                                let tag_text = style_dict.content || `태그 ${i+1}`
                                let css_styles = [
                                    "display:inline-block",
                                    `border-radius:${style_dict.border_radius}px`,
                                    `font-size:${style_dict.font_size}rem`,
                                    `padding:${style_dict.padding.top}rem ${style_dict.padding.right}rem`,
                                    `${style_dict.padding.bottom}rem ${style_dict.padding.left}rem`,
                                    `color:${style_dict.text_color}`
                                ]
                                
                                if(style_dict.style == "transparent_bg"){
                                    css_styles.push(
                                        "background:transparent",
                                        `border:1px solid ${style_dict.color}`
                                    )
                                }else if(style_dict.style == "gradient"){
                                    let base_color:string = style_dict.color //hex

                                    let base_color_rgb = parseInt(base_color, 16)
                                    let r = (base_color_rgb >> 16) & 255
                                    let g = (base_color_rgb >> 8) & 255
                                    let b = base_color_rgb & 255

                                    let light_color = `#${Math.min(255, r+120).toString(16)}${Math.min(255, g+120).toString(16)}${Math.min(255, b+120).toString(16)}`
                                    let dark_color = `#${Math.max(0, r-120).toString(16)}${Math.max(0, g-120).toString(16)}${Math.max(0, b-120).toString(16)}`

                                    css_styles.push(
                                        `background:linear-gradient(135deg, ${light_color}, ${dark_color})`,
                                        "border:none"
                                    )
                                }else{
                                    css_styles.push(
                                        `background:${style_dict.color}`,
                                        "border:none"
                                    )
                                }
                                
                                let tag_html = `
                                    <span style="${css_styles.join(';')}">
                                        ${tag_text}
                                    </span>
                                `
                                tags_html.push(tag_html)
                            }
                        }
                        
                        if(tags_html.length > 0){
                            let container_styles = [
                                "text-align:center",
                                "margin:0 auto",
                                "max-width:fit-content"
                            ]
                            
                            let tags_container = `
                                <div style="${container_styles.join(';')}">
                                    ${tags_html.join('')}
                                </div>
                            `
                            profile_parts.push(tags_container)
                        }
                    }

                    if(self.showDivider){
                        let thickness = self.dividerThickness
                        let divider_style = ""
                        if(self.dividerStyle == "gradient"){
                            let divider_outer_color = self.dividerOuterColor
                            let divider_inner_color = self.dividerInnerColor
                            divider_style = `background:linear-gradient(to right,${divider_outer_color} 0%,${divider_inner_color} 50%,${divider_outer_color} 100%);`
                        }else{
                            let solid_color = self.dividerSolidColor
                            divider_style = `background:${solid_color};`
                        }

                        let divider_html = `
                            <div style="height:${thickness}px;${divider_style}margin:1rem 0;border-radius:${thickness/2}px;">
                                <br>
                            </div>
                        `
                        profile_parts.push(divider_html)
                    }

                    if(profile_parts.length > 0){
                        profile_section_html = `
                            <div style="display:flex;flex-direction:column;text-align:center;margin-bottom:1.25rem;">
                                ${profile_parts.join('')}
                            </div>
                        `
                    }
            }
        return `
        <p><br></p>
        <p><br></p>
        <div style="font-family:${self.styles.font_family};
                    color:${self.styles.text};
                    line-height:1.8;
                    width:100%;
                    max-width:600px;
                    margin:1rem auto;
                    background:${background_color};
                    border-radius:${self.styles.radius_large}px;
                    box-shadow:0px ${shadow_value}px ${shadow_value * 2}px rgba(0,0,0,0.2);
                    ${border_style}">
            <div style="padding:${self.styles.spacing_large}px;">
                <div style="${inner_box_style}">
                    ${profile_section_html}
                    ${content}
                </div>
            </div>
        </div>
        <p><br></p>
        <p><br></p>` 

    }
    
            
}