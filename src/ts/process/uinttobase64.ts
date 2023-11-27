export async function convertToBase64(data: Uint8Array): Promise<string> {
    return new Promise((resolve, reject) => {
        const blob = new Blob([data]);
        const reader = new FileReader();

        reader.onloadend = function() {
            const base64String = reader.result as string;
            resolve(base64String);
        };

        reader.onerror = function(error) {
            reject(error);
        };

        reader.readAsDataURL(blob);
    });
}