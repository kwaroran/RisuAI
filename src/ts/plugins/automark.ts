const reg:[RegExp,string][] = []


export function autoMarkPlugin(data:string){
    if(reg.length === 0){
        const pluginRegex = [
          {"comment":"[ 💱 ]ㅤ구조변환 #1ㅤ=ㅤ대사 부호 수정","in":"“|”","out":"\"","type":"editdisplay","ableFlag":false},
          {"comment":"[ 💱 ]ㅤ구조변환 #2ㅤ=ㅤ생각 부호 수정","in":"‘|’","out":"'","type":"editdisplay","ableFlag":false},
          {"comment":"[ 🧷 ]ㅤ이탈릭체 #1ㅤ=ㅤ문장 앞 묶음 추가","in":"^(?!\\d\\.)([\\wㄱ-ㅎ가-힣'])(?!.*[{<>}])|(?<=^\\[.*\\] *|^\\(.*\\) *)([\\wㄱ-ㅎ가-힣'])(?!.*[{<>}])","out":"<em>$1$2","type":"editdisplay","ableFlag":true,"flag":"gm"},
          {"comment":"[ 🧷 ]ㅤ이탈릭체 #2ㅤ=ㅤ문장 뒤 묶음 추가","in":"(?<!^ +.*)(\".*|<em>.*)(?<!\")$","out":"$1</em>","type":"editdisplay","ableFlag":true,"flag":"gm"},
          {"comment":"[ 🧷 ]ㅤ대사묶음 #1ㅤ=ㅤ대사 앞 묶음 추가","in":"(?<=<em>.*|^\".*)( +\"[\\S])|(?<=<em>.*|\" +.*)( *\\[)","out":"</em>$1$2","type":"editdisplay","ableFlag":true,"flag":"gm"},
          {"comment":"[ 🧷 ]ㅤ대사묶음 #2ㅤ=ㅤ대사 뒤 묶음 추가","in":"(?<=^\".*|<\\/em>.*)([\\S]\" +|[\\S]\"(?=[,.…ㄱ-ㅎ가-힣]))|(?<=<\\/em>.*)( *\\] *)","out":"$1$2<em>","type":"editdisplay","ableFlag":true,"flag":"gm"},
          {"comment":"[ 🧷 ]ㅤ생각묶음 #1ㅤ=ㅤ생각 앞 묶음 추가","in":"(?<=<em>.*? +|\\[|\\[.* +|\\(|\\(.* +|\"|\".*? +)(?<!style=.*)(')|(?<=<em>)('[\\wㄱ-ㅎ가-힣])","out":"<strong><em>$1$2","type":"editdisplay","ableFlag":true,"flag":"gm"},
          {"comment":"[ 🧷 ]ㅤ생각묶음 #2ㅤ=ㅤ생각 뒤 묶음 추가","in":"(?<=<strong><em>')(.*?')(?= +.+?|[ㄱ-ㅎ가-힣?!:;,.…—-])|(?<=<strong><em>'.*)(')(?=<\\/em>|\")|(?<=\\(<strong><em>')(?=\\))","out":"$1$2</em></strong>","type":"editdisplay","ableFlag":true,"flag":"gm"},
          {"comment":"[ 📝 ]ㅤ추가핫키 #1ㅤ=ㅤ따옴표 추가 : (`)","in":"(?<!`)`(?!`)","out":"\"","type":"editinput","ableFlag":false},
          {"comment":"[ 📝 ]ㅤ추가핫키 #2ㅤ=ㅤOOC 추가 : (``)","in":"^``(?!`) *(.*)$","out":"(OOC: $1)","type":"editinput","ableFlag":true,"flag":"gm"}
        ]
        for(const r of pluginRegex){
            reg.push([new RegExp(r.in, r.ableFlag ? r.flag : 'g'),r.out])
        }
    }
    for(let i=0;i<reg.length;i++){
        data = data.replace(reg[i][0], reg[i][1])
    }


    
    return data
}