import type { OpenAIChat } from ".";

export function multiChatReplacer() {}

export function stringlizeChat(formated: OpenAIChat[], char: string = "") {
  let resultString: string[] = [];
  for (const form of formated) {
    if (form.role === "system") {
      resultString.push("'System Note: " + form.content);
    } else if (form.role === "user") {
      resultString.push("user: " + form.content);
    } else if (form.role === "assistant") {
      resultString.push("assistant: " + form.content);
    }
  }
  return resultString.join("\n\n") + `\n\n${char}:`;
}
