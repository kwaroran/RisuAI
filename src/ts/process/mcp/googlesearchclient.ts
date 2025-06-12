import { MCPClientLike } from "./internalmcp";
import type { MCPTool, RPCToolCallContent } from "./mcplib";
import { fetchNative } from "../../globalApi.svelte";

interface WebSearchArgs {
    query: string;
    num?: number;
    start?: number;
    dateRestrict?: string;
    siteSearch?: string;
    fileType?: string;
    language?: string;
    safe?: "active" | "off";
}

interface ImageSearchArgs {
    query: string;
    num?: number;
    start?: number;
    imageSize?: "huge" | "icon" | "large" | "medium" | "small" | "xlarge" | "xxlarge";
    imageType?: "clipart" | "face" | "lineart" | "stock" | "photo" | "animated";
    imageColorType?: "color" | "gray" | "mono" | "trans";
    safe?: "active" | "off";
}

export class GoogleSearchClient extends MCPClientLike {
    private initialized: boolean = false;
    private readonly API_KEY = "";
    private readonly SEARCH_ENGINE_ID = "";

    constructor() {
        super("internal:googlesearch");
        this.serverInfo.serverInfo.name = "Google Search Client";
        this.serverInfo.serverInfo.version = "1.0.0";
        this.serverInfo.instructions = "Provides Google Custom Search functionality using the Google Custom Search REST API to search the web and find images";
    }

    async checkHandshake() {
        if (!this.initialized) {
            this.initialized = true;
        }
        return this.serverInfo;
    }

    async getToolList(): Promise<MCPTool[]> {
        return [
            {
                name: "google_search",
                description: "Search the web using Google Custom Search API. Returns web page results with titles, links, and snippets.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "The search query to execute" },
                        num: { type: "integer", description: "Number of search results to return (1-10, default: 10)", minimum: 1, maximum: 10, default: 10 },
                        start: { type: "integer", description: "The index of the first result to return (default: 1)", minimum: 1, default: 1 },
                        dateRestrict: { type: "string", description: "Restrict results to a specific time period (e.g., 'd1' for past day, 'w1' for past week)" },
                        siteSearch: { type: "string", description: "Restrict search to a specific site (e.g., 'reddit.com')" },
                        fileType: { type: "string", description: "Restrict search to specific file types (e.g., 'pdf', 'doc')" },
                        language: { type: "string", description: "Language code for search results (e.g., 'en', 'es')" },
                        safe: { type: "string", description: "SafeSearch setting", enum: ["active", "off"], default: "active" },
                    },
                    required: ["query"],
                },
            },
            {
                name: "google_search_images",
                description: "Search for images using Google Custom Search API. Returns image results with thumbnails, dimensions, and context.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "The image search query to execute" },
                        num: { type: "integer", description: "Number of image results to return (1-10, default: 10)", minimum: 1, maximum: 10, default: 10 },
                        start: { type: "integer", description: "The index of the first result to return (default: 1)", minimum: 1, default: 1 },
                        imageSize: { type: "string", description: "Size of images to search for", enum: ["huge", "icon", "large", "medium", "small", "xlarge", "xxlarge"] },
                        imageType: { type: "string", description: "Type of images to search for", enum: ["clipart", "face", "lineart", "stock", "photo", "animated"] },
                        imageColorType: { type: "string", description: "Color type of images", enum: ["color", "gray", "mono", "trans"] },
                        safe: { type: "string", description: "SafeSearch setting", enum: ["active", "off"], default: "active" },
                    },
                    required: ["query"],
                },
            },
        ];
    }

    async callTool(toolName: string, args: any): Promise<RPCToolCallContent[]> {
        try {
            switch (toolName) {
                case "google_search":
                    return await this.performWebSearch(args);
                case "google_search_images":
                    return await this.performImageSearch(args);
                default:
                    return [{ type: 'text', text: `Unknown tool: ${toolName}` }];
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return [{ type: 'text', text: `Error: ${errorMessage}` }];
        }
    }

    private buildSearchUrl(query: string, extraParams: Record<string, string>): string {
        const baseUrl = "https://customsearch.googleapis.com/customsearch/v1";
        const params = new URLSearchParams({
            key: this.API_KEY,
            cx: this.SEARCH_ENGINE_ID,
            q: query.trim(),
            ...extraParams
        });
        return `${baseUrl}?${params.toString()}`;
    }

    private async performWebSearch(args: WebSearchArgs): Promise<RPCToolCallContent[]> {
        const { query, num = 10, start = 1, dateRestrict, siteSearch, fileType, language, safe = "active" } = args;

        if (!query || !query.trim()) {
            return [{ type: 'text', text: 'Search query cannot be empty.' }];
        }

        if (!this.API_KEY || !this.SEARCH_ENGINE_ID) {
            return [{ type: 'text', text: 'Google Custom Search API key and Search Engine ID must be configured.' }];
        }

        try {
            const extraParams: Record<string, string> = {
                num: num.toString(),
                start: start.toString(),
                safe: safe,
            };

            if (dateRestrict) extraParams.dateRestrict = dateRestrict;
            if (siteSearch) extraParams.siteSearch = siteSearch;
            if (fileType) extraParams.fileType = fileType;
            if (language) extraParams.hl = language;

            const url = this.buildSearchUrl(query, extraParams);
            const response = await fetchNative(url, { 
                method: 'GET', 
                headers: { 'Accept': 'application/json' } 
            });

            if (!response.ok) {
                const errorText = await response.text();
                return [{ type: 'text', text: `Search API error (${response.status}): ${errorText}` }];
            }

            const data = await response.json();
            if (!data.items || data.items.length === 0) {
                return [{ type: 'text', text: `No search results found for query: "${query}"` }];
            }

            const results = data.items.map((item: any, index: number) => ({
                position: start + index,
                title: item.title || 'No title',
                link: item.link,
                snippet: item.snippet || 'No snippet available',
                displayLink: item.displayLink
            }));

            const summary = {
                query: query,
                totalResults: data.searchInformation?.totalResults || "unknown",
                searchTime: data.searchInformation?.searchTime || "unknown",
                resultsCount: results.length,
                results: results
            };

            return [{ type: 'text', text: JSON.stringify(summary, null, 2) }];
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return [{ type: 'text', text: `Search failed: ${errorMessage}` }];
        }
    }

    private async performImageSearch(args: ImageSearchArgs): Promise<RPCToolCallContent[]> {
        const { query, num = 10, start = 1, imageSize, imageType, imageColorType, safe = "active" } = args;

        if (!query || !query.trim()) {
            return [{ type: 'text', text: 'Search query cannot be empty.' }];
        }

        if (!this.API_KEY || !this.SEARCH_ENGINE_ID) {
            return [{ type: 'text', text: 'Google Custom Search API key and Search Engine ID must be configured.' }];
        }

        try {
            const extraParams: Record<string, string> = {
                num: num.toString(),
                start: start.toString(),
                searchType: 'image',
                safe: safe,
            };

            if (imageSize) extraParams.imgSize = imageSize;
            if (imageType) extraParams.imgType = imageType;
            if (imageColorType) extraParams.imgColorType = imageColorType;

            const url = this.buildSearchUrl(query, extraParams);
            const response = await fetchNative(url, { 
                method: 'GET', 
                headers: { 'Accept': 'application/json' } 
            });

            if (!response.ok) {
                const errorText = await response.text();
                return [{ type: 'text', text: `Image search API error (${response.status}): ${errorText}` }];
            }

            const data = await response.json();
            if (!data.items || data.items.length === 0) {
                return [{ type: 'text', text: `No image results found for query: "${query}"` }];
            }

            const results = data.items.map((item: any, index: number) => ({
                position: start + index,
                title: item.title || 'No title',
                link: item.link,
                displayLink: item.displayLink,
                thumbnail: item.image?.thumbnailLink,
                contextLink: item.image?.contextLink,
                width: item.image?.width,
                height: item.image?.height,
                size: item.image?.byteSize,
                snippet: item.snippet || 'No snippet available',
            }));

            const summary = {
                query: query,
                totalResults: data.searchInformation?.totalResults || "unknown",
                searchTime: data.searchInformation?.searchTime || "unknown",
                resultsCount: results.length,
                results: results
            };

            return [{ type: 'text', text: JSON.stringify(summary, null, 2) }];
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return [{ type: 'text', text: `Image search failed: ${errorMessage}` }];
        }
    }

    destroy() {
        this.initialized = false;
    }
}