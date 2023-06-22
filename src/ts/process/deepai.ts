import md5 from "blueimp-md5";
import { globalFetch } from "../storage/globalApi";
import type { OpenAIChat } from ".";

function randomBytes(size: number): Uint8Array {
    const array = new Uint8Array(size);
    return crypto.getRandomValues(array);
}
export async function createDeep(messages: OpenAIChat[]) {
    const userAgent = navigator.userAgent;

    const part1 = Math.floor(Math.random() * Math.pow(10, 11)).toString();

    const md5Text = (text: string): string => {
        return md5(text).split('').reverse().join('');
    }

    const part2 = md5Text(userAgent + md5Text(userAgent + md5Text(userAgent + part1 + "x")));

    const apiKey = `tryit-${part1}-${part2}`;

    const headers = {
        "api-key": apiKey,
        "user-agent": userAgent
    };

    const body = new URLSearchParams();
    body.append("chat_style", "chat");
    console.log(messages);
    body.append("chatHistory", JSON.stringify(messages));

    const response = await globalFetch("https://api.deepai.org/chat_response", {
        method: 'POST',
        headers: headers,
        body: body,
        rawResponse: true
    });

    return response;
}