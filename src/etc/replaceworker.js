//@ts-check
/// <reference lib="webworker" />
/**
 * @fileoverview This file is used to handover the replace logic of the chat replace script to a web worker.
 * The worker can handle:
 * - Regular expression replacements
 * - Without CBS related replacements
 * - `@@move_top` and `@@move_bottom` replacements
 * The worker can handover:
 * - CBS on output replacements
 * The worker cannot handle:
 * - `@@emo` replacements
 * - `@@inject` replacements
 * - `@@repeat_back` replacements
 * The main thread will handle these unsupported replacements.
 * This should make equal return values as the main thread implementation.
 */

/**
 * import type definitions
 * @typedef {import("src/ts/process/scripts").WorkerRequestPayload} WorkerRequestPayload
 * @typedef {import("src/ts/process/workerManger").WorkerPayload<WorkerRequestPayload>} WorkerRequest
 * @typedef {import("src/ts/process/scripts").WorkerResponsePayload} WorkerResponsePayload
 * @typedef {import("src/ts/process/workerManger").WorkerPayload<WorkerResponsePayload>} WorkerResponse
 * @typedef {WorkerRequestPayload["ctx"]} Context
 * @typedef {WorkerRequestPayload["pscript"]} pScript
 * @typedef {import("src/ts/storage/database.svelte.ts").customscript} customscript
 */

addEventListener("message", async (e) => {
  /** @type {number} */
  const id = e.data.id;
  /** @type {WorkerRequest} */
  const data = e.data;
  try {
    const { pscript, ctx } = data.payload;
    /** @type {WorkerResponse} */
    const response = {payload: await executeScript(id, pscript, ctx), id: id};
    postMessage(response);
  } catch (err) {
    console.error("Error in replace worker:", err);
    postMessage(
      /** @type {WorkerResponse}*/
      { id: id, payload: { needsHandover: true } }
    );
  }
});

const unsupportedFlagReg = /[^dgimsuvy]/g;
const variablePatternRegex = /(?<!\$)\$[0-9]+/g;
const templateVariableRegex = /(?<!\$)\$<([^>]+)>/g;
/**
 * @param {number} id
 * @param {pScript} pscript
 * @param {Context} ctx
 * @returns {Promise<WorkerResponsePayload>}
 */
async function executeScript(id, pscript, ctx) {
  /**
   * @type {WorkerResponsePayload}
   */
  const unsupportedResponse = { needsHandover: true };
  const script = pscript.script;
  /**
   * @type {WorkerResponsePayload}
   */
  let response = {
    data: ctx.data,
    needsHandover: false,
    needsOutptParse: false,
  };

  if (script.in === "") {
    return response;
  }
  if (script.type !== ctx.mode) {
    return response;
  }
  let outScript2 = script.out.replaceAll("$n", "\n");
  let outScript = outScript2.replace(dreg, "$&");
  let flag = "g";
  if (script.ableFlag) {
    flag = script.flag || "g";
  }
  if (
    outScript.startsWith("@@move_top") ||
    outScript.startsWith("@@move_bottom") ||
    pscript.actions.includes("move_top") ||
    pscript.actions.includes("move_bottom")
  ) {
    flag = flag.replace("g", ""); //temperary fix
  }
  if (outScript.endsWith(">") && !pscript.actions.includes("no_end_nl")) {
    outScript += "\n";
  }
  //remove unsupported flag
  flag = flag.trim().replace(unsupportedFlagReg, "");

  // remove repeated flags
  // Used Set which is now baseline
  flag = [...new Set(flag)].join("");

  if (flag.length === 0) {
    flag = "u";
  }

  let input = script.in;

  if (pscript.actions.includes("cbs")) {
    return unsupportedResponse;
  }
  const reg = new RegExp(input, flag);
  if (outScript.startsWith("@@") || pscript.actions.length > 0) {
    if (reg.test(response.data)) {
      if (checkUnsupported(pscript, ctx)) {
        return unsupportedResponse;
      } else if (
        outScript.startsWith("@@move_top") ||
        outScript.startsWith("@@move_bottom") ||
        pscript.actions.includes("move_top") ||
        pscript.actions.includes("move_bottom")
      ) {
        const isGlobal = flag.includes("g");
        const matchAll = isGlobal
          ? response.data.matchAll(reg)
          : [response.data.match(reg)];
        response.data = response.data.replace(reg, "");
        for (const matched of matchAll) {
          if (matched) {
            const inData = matched[0];
            let out = outScript
              .replace("@@move_top ", "")
              .replace("@@move_bottom ", "")
              .replace(variablePatternRegex, (v) => {
                const index = parseInt(v.substring(1));
                if (index < matched.length) {
                  return matched[index];
                }
                return v;
              })
              .replace(/\$\&/g, inData)
              .replace(templateVariableRegex, (v) => {
                const groupName = parseInt(v.substring(2, v.length - 1));
                if (matched.groups && matched.groups[groupName]) {
                  return matched.groups[groupName];
                }
                return v;
              });
            if (
              outScript.startsWith("@@move_top") ||
              pscript.actions.includes("move_top")
            ) {
              response.data = out + "\n" + response.data;
            } else {
              response.data = response.data + "\n" + out;
            }
          }
        }
      } else {
        response.data = response.data.replace(reg, outScript);
        response.needsOutptParse = true;
      }
    } else {
      if (
        (outScript.startsWith("@@repeat_back") ||
          pscript.actions.includes("repeat_back")) &&
        ctx.chatID !== -1
      ) {
        return unsupportedResponse;
      }
    }
  } else {
    response.data = response.data.replace(reg, outScript);
    response.needsOutptParse = true;
  }
  return response;
}

/**
 * Checks whether the script contains unsupported actions for worker execution.
 * This doesn't check for `@@repeat_back` as that is only valid on non-matching.
 * @param {pScript} pscript
 * @param {Context} ctx
 * @returns {boolean}
 */
function checkUnsupported(pscript, ctx) {
  const script = pscript.script;
  if (script.out.startsWith("@@emo ")) {
    return true;
  }
  if (script.out.startsWith("@@inject") || pscript.actions.includes("inject")) {
    return true;
  }
  return false;
}
const dreg = /{{data}}/g;
