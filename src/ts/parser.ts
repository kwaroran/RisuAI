import DOMPurify from 'isomorphic-dompurify';
import showdown from 'showdown';
import { DataBase, type character, type groupChat } from './storage/database';
import { getFileSrc } from './storage/globalApi';
import { processScript } from './process/scripts';
import { get } from 'svelte/store';

const convertor = new showdown.Converter({
    simpleLineBreaks: true,
    strikethrough: true,
    tables: true
})

const safeConvertor = new showdown.Converter({
    simpleLineBreaks: true,
    strikethrough: true,
    tables: true,
    backslashEscapesHTMLTags: true
})

DOMPurify.addHook("uponSanitizeElement", (node: HTMLElement, data) => {
    if (data.tagName === "iframe") {
       const src = node.getAttribute("src") || "";
       if (!src.startsWith("https://www.youtube.com/embed/")) {
          return node.parentNode.removeChild(node);
       }
    }
});

DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
    if(data.attrName === 'style'){
        data.attrValue = data.attrValue.replace(/(absolute)|(z-index)|(fixed)/g, '')
    }
})

export async function ParseMarkdown(data:string, char:(character | groupChat) = null, mode:'normal'|'back' = 'normal') {
    if(char && char.type !== 'group'){
        if(char.additionalAssets){
            for(const asset of char.additionalAssets){
                const assetPath = await getFileSrc(asset[1])
                data = data.replaceAll(`{{raw::${asset[0]}}}`, assetPath).
                        replaceAll(`{{img::${asset[0]}}}`,`<img src="${assetPath}" />`)
                        .replaceAll(`{{video::${asset[0]}}}`,`<video autoplay loop><source src="${assetPath}" type="video/mp4"></video>`)
                        .replaceAll(`{{audio::${asset[0]}}}`,`<audio autoplay loop><source src="${assetPath}" type="audio/mpeg"></audio>`)
                if(mode === 'back'){
                    data = data.replaceAll(`{{bg::${asset[0]}}}`, `<div style="width:100%;height:100%;background: linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8)),url(${assetPath}); background-size: cover;"></div>`)
                }
            }
        }
    }
    if(char){
        data = processScript(char, data, 'editdisplay')
    }
    return DOMPurify.sanitize(convertor.makeHtml(data), {
        ADD_TAGS: ["iframe"],
        ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling"],
    })
}

export function parseMarkdownSafe(data:string) {
    return DOMPurify.sanitize(safeConvertor.makeHtml(data), {
        FORBID_TAGS: ["a", "style"],
        FORBID_ATTR: ["style"]
    })
}

export async function hasher(data:Uint8Array){
    return Buffer.from(await crypto.subtle.digest("SHA-256", data)).toString('hex');
}

export async function convertImage(data:Uint8Array) {
    if(!get(DataBase).imageCompression){
        return data
    }
    const type = checkImageType(data)
    if(type !== 'Unknown' && type !== 'WEBP' && type !== 'AVIF'){
        if(type === 'PNG' && isAPNG(data)){
            return data
        }

        console.log('converting')
        return await resizeAndConvert(data)
    }
    return data
}

async function resizeAndConvert(imageData: Uint8Array): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const base64Image = 'data:image/png;base64,' + Buffer.from(imageData).toString('base64');
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(base64Image);

            // Create a canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) {
                throw new Error('Unable to get 2D context');
            }

            // Compute the new dimensions while maintaining aspect ratio
            let { width, height } = image;
            if (width > 3000 || height > 3000) {
                const aspectRatio = width / height;
                if (width > height) {
                    width = 3000;
                    height = Math.round(width / aspectRatio);
                } else {
                    height = 3000;
                    width = Math.round(height * aspectRatio);
                }
            }

            // Resize and draw the image to the canvas
            canvas.width = width;
            canvas.height = height;
            context.drawImage(image, 0, 0, width, height);

            // Try to convert to WebP
            let base64 = canvas.toDataURL('image/webp', 90);

            // If WebP is not supported, convert to JPEG
            if (base64.indexOf('data:image/webp') != 0) {
                base64 = canvas.toDataURL('image/jpeg', 90);
            }

            // Convert it to Uint8Array
            const array = Buffer.from(base64.split(',')[1], 'base64');
            resolve(array);
        };
        image.src = base64Image;
    });
}

type ImageType = 'JPEG' | 'PNG' | 'GIF' | 'BMP' | 'AVIF' | 'WEBP' | 'Unknown';

function checkImageType(arr:Uint8Array):ImageType {
    const isJPEG = arr[0] === 0xFF && arr[1] === 0xD8 && arr[arr.length-2] === 0xFF && arr[arr.length-1] === 0xD9;
    const isPNG = arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47 && arr[4] === 0x0D && arr[5] === 0x0A && arr[6] === 0x1A && arr[7] === 0x0A;
    const isGIF = arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x38 && (arr[4] === 0x37 || arr[4] === 0x39) && arr[5] === 0x61;
    const isBMP = arr[0] === 0x42 && arr[1] === 0x4D;
    const isAVIF = arr[4] === 0x66 && arr[5] === 0x74 && arr[6] === 0x79 && arr[7] === 0x70 && arr[8] === 0x61 && arr[9] === 0x76 && arr[10] === 0x69 && arr[11] === 0x66;
    const isWEBP = arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 && arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50;

    if (isJPEG) return "JPEG";
    if (isPNG) return "PNG";
    if (isGIF) return "GIF";
    if (isBMP) return "BMP";
    if (isAVIF) return "AVIF";
    if (isWEBP) return "WEBP";
    return "Unknown";
}

function isAPNG(pngData: Uint8Array): boolean {
    const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    const acTL = [0x61, 0x63, 0x54, 0x4C];
  
    if (!pngData.slice(0, pngSignature.length).every((v, i) => v === pngSignature[i])) {
      throw new Error('Invalid PNG data');
    }
  
    for (let i = pngSignature.length; i < pngData.length - 12; i += 4) {
      if (pngData.slice(i + 4, i + 8).every((v, j) => v === acTL[j])) {
        return true;
      }
    }
    return false;
}  