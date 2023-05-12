import { get } from "svelte/store";
import {
  alertConfirm,
  alertError,
  alertNormal,
  alertSelect,
  alertStore,
} from "./alert";
import {
  DataBase,
  defaultSdDataFunc,
  type character,
  saveImage,
  setDatabase,
  type customscript,
  type loreSettings,
  type loreBook,
} from "./database";
import { checkNullish, selectSingleFile, sleep } from "./util";
import { language } from "src/lang";
import {
  encode as encodeMsgpack,
  decode as decodeMsgpack,
} from "@msgpack/msgpack";
import { v4 as uuidv4 } from "uuid";
import exifr from "exifr";
import { PngMetadata } from "./exif";
import { characterFormatUpdate } from "./characters";
import { downloadFile, readImage } from "./globalApi";
import { cloneDeep } from "lodash";

export async function importCharacter() {
  try {
    const f = await selectSingleFile(["png", "json"]);
    if (!f) {
      return;
    }
    if (f.name.endsWith("json")) {
      const da = JSON.parse(Buffer.from(f.data).toString("utf-8"));
      if (await importSpecv2(da)) {
        let db = get(DataBase);
        return db.characters.length - 1;
      }
      if (
        (da.char_name || da.name) &&
        (da.char_persona || da.description) &&
        (da.char_greeting || da.first_mes)
      ) {
        let db = get(DataBase);
        db.characters.push(convertOldTavernAndJSON(da));
        DataBase.set(db);
        alertNormal(language.importedCharacter);
        return;
      } else {
        alertError(language.errors.noData);
        return;
      }
    }
    alertStore.set({
      type: "wait",
      msg: "Loading... (Reading)",
    });
    await sleep(10);
    const img = f.data;
    const readed = await exifr.parse(img, true);
    if (readed.chara) {
      // standard spec v2 imports
      const charaData: CharacterCardV2 = JSON.parse(
        Buffer.from(readed.chara, "base64").toString("utf-8")
      );
      if (await importSpecv2(charaData, img)) {
        let db = get(DataBase);
        return db.characters.length - 1;
      }
    }
    if (readed.risuai) {
      // old risu imports
      await sleep(10);
      const va = decodeMsgpack(Buffer.from(readed.risuai, "base64")) as any;
      if (va.type !== 101) {
        alertError(language.errors.noData);
        return;
      }

      let char: character = va.data;
      let db = get(DataBase);
      if (char.emotionImages && char.emotionImages.length > 0) {
        for (let i = 0; i < char.emotionImages.length; i++) {
          alertStore.set({
            type: "wait",
            msg: `Loading... (Getting Emotions ${i} / ${char.emotionImages.length})`,
          });
          await sleep(10);
          const imgp = await saveImage(char.emotionImages[i][1] as any);
          char.emotionImages[i][1] = imgp;
        }
      }
      char.chats = [
        {
          message: [],
          note: "",
          name: "Chat 1",
          localLore: [],
        },
      ];

      if (checkNullish(char.sdData)) {
        char.sdData = defaultSdDataFunc();
      }

      char.chatPage = 0;
      char.image = await saveImage(PngMetadata.filter(img));
      db.characters.push(characterFormatUpdate(char));
      char.chaId = uuidv4();
      setDatabase(db);
      alertNormal(language.importedCharacter);
      return db.characters.length - 1;
    } else if (readed.chara) {
      const charaData: OldTavernChar = JSON.parse(
        Buffer.from(readed.chara, "base64").toString("utf-8")
      );
      const imgp = await saveImage(PngMetadata.filter(img));
      let db = get(DataBase);
      db.characters.push(convertOldTavernAndJSON(charaData, imgp));
      DataBase.set(db);
      alertNormal(language.importedCharacter);
      return db.characters.length - 1;
    } else {
      alertError(language.errors.noData);
      return null;
    }
  } catch (error) {
    alertError(`${error}`);
    return null;
  }
}

export async function characterHubImport() {
  const charPath = new URLSearchParams(location.search).get("charahub");
  try {
    if (charPath) {
      const url = new URL(location.href);
      url.searchParams.delete("charahub");
      window.history.pushState(null, "", url.toString());
      const chara = await fetch(
        "https://api.characterhub.org/api/characters/download",
        {
          method: "POST",
          body: JSON.stringify({
            format: "tavern",
            fullPath: charPath,
            version: "main",
          }),
          headers: {
            "content-type": "application/json",
          },
        }
      );
      const img = new Uint8Array(await chara.arrayBuffer());

      const readed = await exifr.parse(img, true);
      {
        const charaData: CharacterCardV2 = JSON.parse(
          Buffer.from(readed.chara, "base64").toString("utf-8")
        );
        if (await importSpecv2(charaData, img)) {
          return;
        }
      }
      {
        const imgp = await saveImage(PngMetadata.filter(img));
        let db = get(DataBase);
        const charaData: OldTavernChar = JSON.parse(
          Buffer.from(readed.chara, "base64").toString("utf-8")
        );
        db.characters.push(convertOldTavernAndJSON(charaData, imgp));

        DataBase.set(db);
        alertNormal(language.importedCharacter);
        return;
      }
    }
  } catch (error) {
    alertError(language.errors.noData);
    return null;
  }
}

function convertOldTavernAndJSON(
  charaData: OldTavernChar,
  imgp: string | undefined = undefined
): character {
  return {
    name: charaData.name ?? "unknown name",
    firstMessage: charaData.first_mes ?? "unknown first message",
    desc: charaData.description ?? "",
    notes: "",
    chats: [
      {
        message: [],
        note: "",
        name: "Chat 1",
        localLore: [],
      },
    ],
    chatPage: 0,
    image: imgp,
    emotionImages: [],
    bias: [],
    globalLore: [],
    viewScreen: "none",
    chaId: uuidv4(),
    sdData: defaultSdDataFunc(),
    utilityBot: false,
    customscript: [],
    exampleMessage: charaData.mes_example,
    creatorNotes: "",
    systemPrompt: "",
    postHistoryInstructions: "",
    alternateGreetings: [],
    tags: [],
    creator: "",
    characterVersion: 0,
    personality: charaData.personality ?? "",
    scenario: charaData.scenario ?? "",
    firstMsgIndex: -1,
  };
}

export async function exportChar(charaID: number) {
  const db = get(DataBase);
  let char = cloneDeep(db.characters[charaID]);

  if (char.type === "group") {
    return;
  }

  if (!char.image) {
    alertError("Image Required");
    return;
  }
  const conf = await alertConfirm(language.exportConfirm);
  if (!conf) {
    return;
  }

  const sel = await alertSelect([
    "Export as Spec V2",
    "Export as Old RisuCard",
  ]);
  if (sel === "0") {
    exportSpecV2(char);
    return;
  }

  alertStore.set({
    type: "wait",
    msg: "Loading...",
  });

  let img = await readImage(char.image);

  try {
    if (char.emotionImages && char.emotionImages.length > 0) {
      for (let i = 0; i < char.emotionImages.length; i++) {
        alertStore.set({
          type: "wait",
          msg: `Loading... (Getting Emotions ${i} / ${char.emotionImages.length})`,
        });
        const rData = await readImage(char.emotionImages[i][1]);
        char.emotionImages[i][1] = rData as any;
      }
    }

    char.chats = [];

    alertStore.set({
      type: "wait",
      msg: "Loading... (Compressing)",
    });

    await sleep(10);

    const data = Buffer.from(
      encodeMsgpack({
        data: char,
        type: 101,
      })
    ).toString("base64");

    alertStore.set({
      type: "wait",
      msg: "Loading... (Writing Exif)",
    });

    const tavernData: OldTavernChar = {
      avatar: "none",
      chat: "",
      create_date: `${Date.now()}`,
      description: char.desc,
      first_mes: char.firstMessage,
      mes_example: "<START>",
      name: char.name,
      personality: "",
      scenario: "",
      talkativeness: "0.5",
    };

    await sleep(10);
    img = PngMetadata.write(img, {
      chara: Buffer.from(JSON.stringify(tavernData)).toString("base64"),
      risuai: data,
    });

    alertStore.set({
      type: "wait",
      msg: "Loading... (Writing)",
    });

    char.image = "";
    await sleep(10);
    await downloadFile(
      `${char.name.replace(/[<>:"/\\|?*\.\,]/g, "")}_export.png`,
      img
    );

    alertNormal(language.successExport);
  } catch (e) {
    alertError(`${e}`);
  }
}

async function importSpecv2(
  card: CharacterCardV2,
  img?: Uint8Array
): Promise<boolean> {
  if (!card || card.spec !== "chara_card_v2") {
    return false;
  }

  const data = card.data;
  const im = img ? await saveImage(PngMetadata.filter(img)) : undefined;
  let db = get(DataBase);

  const risuext = cloneDeep(data.extensions.risuai);
  let emotions: [string, string][] = [];
  let bias: [string, number][] = [];
  let viewScreen: "none" | "emotion" | "imggen" = "none";
  let customScripts: customscript[] = [];
  let utilityBot = false;
  let sdData = defaultSdDataFunc();

  if (risuext) {
    if (risuext.emotions) {
      for (let i = 0; i < risuext.emotions.length; i++) {
        alertStore.set({
          type: "wait",
          msg: `Loading... (Getting Emotions ${i} / ${risuext.emotions.length})`,
        });
        await sleep(10);
        const imgp = await saveImage(
          Buffer.from(risuext.emotions[i][1], "base64")
        );
        emotions.push([risuext.emotions[i][0], imgp]);
      }
    }
    bias = risuext.bias ?? bias;
    viewScreen = risuext.viewScreen ?? viewScreen;
    customScripts = risuext.customScripts ?? customScripts;
    utilityBot = risuext.utilityBot ?? utilityBot;
    sdData = risuext.sdData ?? sdData;
  }

  const charbook = data.character_book;
  let lorebook: loreBook[] = [];
  let loresettings: undefined | loreSettings = undefined;
  let loreExt: undefined | any = undefined;
  if (charbook) {
    if (
      !checkNullish(charbook.recursive_scanning) &&
      !checkNullish(charbook.scan_depth) &&
      !checkNullish(charbook.token_budget)
    ) {
      loresettings = {
        tokenBudget: charbook.token_budget,
        scanDepth: charbook.scan_depth,
        recursiveScanning: charbook.recursive_scanning,
      };
    }

    loreExt = charbook.extensions;

    for (const book of charbook.entries) {
      lorebook.push({
        key: book.keys.join(", "),
        secondkey: book.secondary_keys?.join(", ") ?? "",
        insertorder: book.insertion_order,
        comment: book.name ?? book.comment ?? "",
        content: book.content,
        mode: "normal",
        alwaysActive: book.constant ?? false,
        selective: book.selective ?? false,
        extentions: book.extensions,
      });
    }
  }

  let char: character = {
    name: data.name ?? "",
    firstMessage: data.first_mes ?? "",
    desc: data.description ?? "",
    notes: "",
    chats: [
      {
        message: [],
        note: "",
        name: "Chat 1",
        localLore: [],
      },
    ],
    chatPage: 0,
    image: im,
    emotionImages: emotions,
    bias: bias,
    globalLore: lorebook, //lorebook
    viewScreen: viewScreen,
    chaId: uuidv4(),
    sdData: sdData,
    utilityBot: utilityBot,
    customscript: customScripts,
    exampleMessage: data.mes_example ?? "",
    creatorNotes: data.creator_notes ?? "",
    systemPrompt: data.system_prompt ?? "",
    postHistoryInstructions: data.post_history_instructions ?? "",
    alternateGreetings: data.alternate_greetings ?? [],
    tags: data.tags ?? [],
    creator: data.creator ?? "",
    characterVersion: data.character_version ?? 0,
    personality: data.personality ?? "",
    scenario: data.scenario ?? "",
    firstMsgIndex: -1,
    removedQuotes: false,
    loreSettings: loresettings,
    loreExt: loreExt,
    additionalData: {
      tag: data.tags,
      creator: data.creator,
      character_version: data.character_version,
    },
  };

  db.characters.push(char);

  setDatabase(db);

  alertNormal(language.importedCharacter);
  return true;
}

export async function exportSpecV2(char: character) {
  let img = await readImage(char.image);

  try {
    let charBook: charBookEntry[] = [];
    for (const lore of char.globalLore) {
      charBook.push({
        keys: lore.key.split(",").map((r) => r.trim()),
        secondary_keys: lore.selective
          ? lore.secondkey.split(",").map((r) => r.trim())
          : undefined,
        content: lore.content,
        extensions: lore.extentions ?? {},
        enabled: true,
        insertion_order: lore.insertorder,
        constant: lore.alwaysActive,
        selective: lore.selective,
        name: lore.comment,
        comment: lore.comment,
      });
    }

    const card: CharacterCardV2 = {
      spec: "chara_card_v2",
      spec_version: "2.0",
      data: {
        name: char.name,
        description: char.desc,
        personality: char.personality,
        scenario: char.scenario,
        first_mes: char.firstMessage,
        mes_example: char.exampleMessage,
        creator_notes: char.creatorNotes,
        system_prompt: char.systemPrompt,
        post_history_instructions: char.postHistoryInstructions,
        alternate_greetings: char.alternateGreetings,
        character_book: {
          scan_depth: char.loreSettings?.scanDepth,
          token_budget: char.loreSettings?.tokenBudget,
          recursive_scanning: char.loreSettings?.recursiveScanning,
          extensions: char.loreExt ?? {},
          entries: [],
        },
        tags: char.additionalData?.tag ?? [],
        creator: char.additionalData?.creator ?? "",
        character_version: char.additionalData?.character_version ?? 0,
        extensions: {
          risuai: {
            emotions: char.emotionImages,
            bias: char.bias,
            viewScreen: char.viewScreen,
            customScripts: char.customscript,
            utilityBot: char.utilityBot,
            sdData: char.sdData,
          },
        },
      },
    };

    if (
      card.data.extensions.risuai.emotions &&
      card.data.extensions.risuai.emotions.length > 0
    ) {
      for (let i = 0; i < card.data.extensions.risuai.emotions.length; i++) {
        alertStore.set({
          type: "wait",
          msg: `Loading... (Getting Emotions ${i} / ${card.data.extensions.risuai.emotions.length})`,
        });
        const rData = await readImage(
          card.data.extensions.risuai.emotions[i][1]
        );
        char.emotionImages[i][1] = Buffer.from(rData).toString("base64");
      }
    }

    alertStore.set({
      type: "wait",
      msg: "Loading... (Writing Exif)",
    });

    await sleep(10);
    img = PngMetadata.write(img, {
      chara: Buffer.from(JSON.stringify(card)).toString("base64"),
    });

    alertStore.set({
      type: "wait",
      msg: "Loading... (Writing)",
    });

    char.image = "";
    await sleep(10);
    await downloadFile(
      `${char.name.replace(/[<>:"/\\|?*\.\,]/g, "")}_export.png`,
      img
    );

    alertNormal(language.successExport);
  } catch (e) {
    alertError(`${e}`);
  }
}

type CharacterCardV2 = {
  spec: "chara_card_v2";
  spec_version: "2.0"; // May 8th addition
  data: {
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
    creator_notes: string;
    system_prompt: string;
    post_history_instructions: string;
    alternate_greetings: string[];
    character_book?: CharacterBook;
    tags: string[];
    creator: string;
    character_version: number;
    extensions: {
      risuai?: {
        emotions?: [string, string][];
        bias?: [string, number][];
        viewScreen?: "none" | "emotion" | "imggen";
        customScripts?: customscript[];
        utilityBot?: boolean;
        sdData?: [string, string][];
      };
    };
  };
};

interface OldTavernChar {
  avatar: "none";
  chat: string;
  create_date: string;
  description: string;
  first_mes: string;
  mes_example: string;
  name: string;
  personality: "";
  scenario: "";
  talkativeness: "0.5";
}
type CharacterBook = {
  name?: string;
  description?: string;
  scan_depth?: number; // agnai: "Memory: Chat History Depth"
  token_budget?: number; // agnai: "Memory: Context Limit"
  recursive_scanning?: boolean; // no agnai equivalent. whether entry content can trigger other entries
  extensions: Record<string, any>;
  entries: Array<charBookEntry>;
};

interface charBookEntry {
  keys: Array<string>;
  content: string;
  extensions: Record<string, any>;
  enabled: boolean;
  insertion_order: number; // if two entries inserted, lower "insertion order" = inserted higher

  // FIELDS WITH NO CURRENT EQUIVALENT IN SILLY
  name?: string; // not used in prompt engineering
  priority?: number; // if token budget reached, lower priority value = discarded first

  // FIELDS WITH NO CURRENT EQUIVALENT IN AGNAI
  id?: number; // not used in prompt engineering
  comment?: string; // not used in prompt engineering
  selective?: boolean; // if `true`, require a key from both `keys` and `secondary_keys` to trigger the entry
  secondary_keys?: Array<string>; // see field `selective`. ignored if selective == false
  constant?: boolean; // if true, always inserted in the prompt (within budget limit)
  position?: "before_char" | "after_char"; // whether the entry is placed before or after the character defs
}
