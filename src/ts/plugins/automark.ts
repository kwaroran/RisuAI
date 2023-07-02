const reg:[RegExp,string][] = []


export function autoMarkPlugin(data:string){
    if(reg.length === 0){
        const pluginRegex = [
            {
              "in": "“|”",
              "out": "\"",
              "flag": "g"
            },
            {
              "in": "‘|’",
              "out": "'",
              "flag": "g"
            },
            {
              "in": "^(?!\\d\\.)([\\wㄱ-ㅎ가-힣'])(?!.*[{<>}])|(?<=^\\[.*\\] *|^\\(.*\\) *)([\\wㄱ-ㅎ가-힣'])(?!.*[{<>}])",
              "out": "<em>$1$2",
              "flag": "gm"
            },
            {
              "in": "(?<!^ +.*)(\".*|<em>.*)(?<!\")$",
              "out": "$1</em>",
              "flag": "gm"
            },
            {
              "in": "(?<=<em>.*|^\".*)( +\"[\\S])|(?<=<em>.*|\" +.*)( *\\[)",
              "out": "</em>$1$2",
              "flag": "gm"
            },
            {
              "in": "(?<=^\".*|<\\/em>.*)([\\S]\" +|[\\S]\"(?=[,.…ㄱ-ㅎ가-힣]))|(?<=<\\/em>.*)( *\\] *)",
              "out": "$1$2<em>",
              "flag": "gm"
            },
            {
              "in": "(?<=<em>.*? +|\\[|\\[.* +|\\(|\\(.* +|\"|\".*? +)(?<!style=.*)(')|(?<=<em>)('[\\wㄱ-ㅎ가-힣])",
              "out": "<strong><em>$1$2",
              "flag": "gm"
            },
            {
              "in": "(?<=<strong><em>')(.*?')(?= +.+?|[ㄱ-ㅎ가-힣?!:;,.…—-])|(?<=<strong><em>'.*)(')(?=<\\/em>|\")|(?<=\\(<strong><em>')(?=\\))",
              "out": "$1$2</em></strong>",
              "flag": "gm"
            }
        ]
        for(const r of pluginRegex){
            reg.push([new RegExp(r.in, r.flag),r.out])
        }
    }
    for(let i=0;i<reg.length;i++){
        data = data.replace(reg[i][0], reg[i][1])
    }
    return data
}