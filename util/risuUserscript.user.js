// ==UserScript==
// @name        RisuAI Requester
// @version     1.0.0
// @match       https://risuai.xyz/*
// @grant       GM.xmlHttpRequest
// @require     https://cdn.jsdelivr.net/npm/@trim21/gm-fetch@0.2.3
// @run-at      document-end
// @connect     *
// ==/UserScript==

unsafeWindow.fetchWithUSFetch = GM_fetch