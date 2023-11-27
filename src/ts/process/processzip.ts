import JSZip from "jszip";

export async function processZip(dataArray: Uint8Array): Promise<string> {
    const blob = new Blob([dataArray], { type: "application/zip" });
    const zip = new JSZip();
    const zipData = await zip.loadAsync(blob);

    const imageFile = Object.keys(zipData.files).find(fileName => /\.(jpg|jpeg|png)$/.test(fileName));
    if (imageFile) {
        const imageData = await zipData.files[imageFile].async("base64");
        return `data:image/png;base64,${imageData}`;
    } else {
        throw new Error("No image found in ZIP file");
    }
}