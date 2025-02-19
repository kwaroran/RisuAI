// ==UserScript==
// @name        RisuAI Requester
// @version     1.0.0
// @match       https://risuai.xyz/*
// @grant       GM.xmlHttpRequest
// @require     https://cdn.jsdelivr.net/npm/@trim21/gm-fetch@0.2.3
// @run-at      document-end
// @description RisuAI Requester, using GM_fetch for cross-origin requests
// @license     MIT
// @namespace   risuai-requester
// @icon        https://risuai.xyz/favicon.ico
// @author      risuai
// @connect     *
// ==/UserScript==

unsafeWindow.userScriptFetch = GM_fetch