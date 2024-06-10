
interface TextSyntSyntaxTree {
    name: string;
    children: TextSyntSyntaxTree[];
}

function parseMarkdownLikeYaml(text:string){

    const lines = text.split('\n');
    const root: TextSyntSyntaxTree = {name: 'root', children: []};
    let rootHashIndentation = -1;
    let currentIndentation = 0;

    for(let i = 0; i < lines.length; i++){
        const line = lines[i];

        if(line.startsWith('#')){
            let indentations = 0;
            while(line[indentations] === '#'){
                indentations++;
            }

            if(currentIndentation === 0 && rootHashIndentation === -1){
                rootHashIndentation = indentations;
                indentations = 1;
            }
            else{
                indentations -= (rootHashIndentation - 1)
            }
        }

    }
}