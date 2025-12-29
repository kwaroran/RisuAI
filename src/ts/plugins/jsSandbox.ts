import type { SandboxOptions } from "@sebastianwessel/quickjs";
import { v4 } from "uuid";


type VirtualElement = {
    type: 'element',
    
}

class DomSerializer {
    serializeToDomID (node: HTMLElement): string {
        const refed = v4()
        node.setAttribute('x-plugin-referenced', refed);
        return refed
    }
    serializeNodeListToDomIDs (nodes: NodeListOf<HTMLElement>): string {
        const ids: string[] = []
        nodes.forEach((node) => {
            ids.push(this.serializeToDomID(node))
        })
        return JSON.stringify({
            type: 'nodelist',
            ids: ids
        })
    }
    deserializeFromDomID (id: string): HTMLElement | null {
        const nodes = document.querySelectorAll(`[x-plugin-referenced="${id}"]`);
        if (nodes.length === 0) return null;
        return nodes[0] as HTMLElement;
    }
};

async function runQuickJSPlugin(code:string){
    let variant = await import(`@jitl/quickjs-ng-wasmfile-release-sync`)
    let { loadQuickJs } = await import("@sebastianwessel/quickjs");

    const options: SandboxOptions = {
        allowFetch: true, // inject fetch and allow the code to fetch data
        allowFs: true, // mount a virtual file system and provide node:fs module
        env: {
            risuai: {
                getDocument(param:string){
                    const whiteListed = [
                        'body',
                        'characterSet',
                        'doctype',
                        'documentElement',
                        'documentURI',
                        'location',
                        'readyState',
                        'title',
                        'head'
                    ]
                }
            }
        },
    };
}