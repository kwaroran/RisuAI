# RisuAI

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/kwaroran/RisuAI/assets/116663078/efbbfe78-65ad-43ef-89f8-36fa94826925">
  <img alt="text" src="https://github.com/kwaroran/RisuAI/assets/116663078/bc28e5a3-c6da-4a42-bfc1-f3ab3debdf65">
</picture>

[![Svelte](https://img.shields.io/badge/svelte-4-red?logo=svelte)](https://svelte.dev/) [![Typescript](https://img.shields.io/badge/typescript-5-blue?logo=typescript)](https://www.typescriptlang.org/) [![Tauri](https://img.shields.io/badge/tauri-1.5-%2324C8D8?logo=tauri)](https://tauri.app/)

RisuAI, or Risu for short, is a cross platform AI chatting software / web application with powerful features such as multiple API support, assets in the chat, regex functions and much more.

# Screenshots

|         Screenshot 1         |         Screenshot 2         |
| :--------------------------: | :--------------------------: |
| ![Screenshot 1][screenshot1] | ![Screenshot 2][screenshot2] |
| ![Screenshot 3][screenshot3] | ![Screenshot 4][screenshot4] |

[screenshot1]: https://github.com/kwaroran/RisuAI/assets/116663078/cccb9b33-5dbd-47d7-9c85-61464790aafe
[screenshot2]: https://github.com/kwaroran/RisuAI/assets/116663078/30d29f85-1380-4c73-9b82-1a40f2c5d2ea
[screenshot3]: https://github.com/kwaroran/RisuAI/assets/116663078/faad0de5-56f3-4176-b38e-61c2d3a8698e
[screenshot4]: https://github.com/kwaroran/RisuAI/assets/116663078/ef946882-2311-43e7-81e7-5ca2d484fa90

## Features

- **Multiple API Supports**: Supports OAI, Claude, Ooba, OpenRouter... and More!
- **Emotion Images**: Display the image of the current character, according to his/her expressions!
- **Group Chats**: Multiple characters in one chat.
- **Plugins**: Add your features and providers, and simply share.
- **Regex Script**: Modify model's output by regex, to make a custom GUI and others
- **Powerful Translators**: Automatically translate the input/output, so you can roleplay without knowing model's language.
- **Lorebook**: Also known as world infos or memory book, which can make character memorize more. 
- **Themes**: Choose it from 3 themes, Classic, WaifuLike, WaifuCut.
- **Powerful Prompting**: Change the prompting order easily, Impersonate inside prompts, Use conditions, variables... and more!
- **Customizable, Friendly UI**: Great Accessibility and mobile friendly
- **TTS**: Use TTS to make the output text into voice.
- **Additonal Assets**: Embed your images, audios and videos to bot, and make it display at chat or background!
- And More!

You can get detailed information on https://github.com/kwaroran/RisuAI/wiki (Work in Progress)

## Discord

- https://discord.gg/JzP8tB9ZK8

## Installation

- [RisuAI Website](https://risuai.net) (Recommended)
- [Github Releases](https://github.com/kwaroran/RisuAI/releases)

### Docker Installation

You can also run RisuAI using Docker. This method is particularly useful for web hosting.

1. Run the Docker container:
   ```
   curl -L https://raw.githubusercontent.com/kwaroran/RisuAI/refs/heads/main/docker-compose.yml | docker compose -f - up -d
   ```

2. Access RisuAI at `http://localhost:6001` in your web browser.
