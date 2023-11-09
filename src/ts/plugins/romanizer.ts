export function romanizer(texts:string[]){
    const koreanDict = {"cho":{"ᄀ":"g","ᄁ":"kk","ᄂ":"n","ᄃ":"d","ᄄ":"tt","ᄅ":"r","ᄆ":"m","ᄇ":"b","ᄈ":"pp","ᄉ":"s","ᄊ":"ss","ᄋ":"","ᄌ":"j","ᄍ":"jj","ᄎ":"ch","ᄏ":"k","ᄐ":"t","ᄑ":"p","ᄒ":"h"},"jung":{"ᅡ":"a","ᅢ":"ae","ᅣ":"ya","ᅤ":"yae","ᅥ":"eo","ᅦ":"e","ᅧ":"yeo","ᅨ":"ye","ᅩ":"o","ᅪ":"wa","ᅫ":"wae","ᅬ":"oe","ᅭ":"yo","ᅮ":"u","ᅯ":"wo","ᅰ":"we","ᅱ":"wi","ᅲ":"yu","ᅳ":"eu","ᅴ":"eui","ᅵ":"i"},"jong":{"ᆨ":"k","ᆨᄋ":"g","ᆨᄂ":"ngn","ᆨᄅ":"ngn","ᆨᄆ":"ngm","ᆨᄒ":"kh","ᆩ":"kk","ᆩᄋ":"kg","ᆩᄂ":"ngn","ᆩᄅ":"ngn","ᆩᄆ":"ngm","ᆩᄒ":"kh","ᆪ":"k","ᆪᄋ":"ks","ᆪᄂ":"ngn","ᆪᄅ":"ngn","ᆪᄆ":"ngm","ᆪᄒ":"kch","ᆫ":"n","ᆫᄅ":"ll","ᆬ":"n","ᆬᄋ":"nj","ᆬᄂ":"nn","ᆬᄅ":"nn","ᆬᄆ":"nm","ᆬㅎ":"nch","ᆭ":"n","ᆭᄋ":"nh","ᆭᄅ":"nn","ᆮ":"t","ᆮᄋ":"d","ᆮᄂ":"nn","ᆮᄅ":"nn","ᆮᄆ":"nm","ᆮᄒ":"th","ᆯ":"l","ᆯᄋ":"r","ᆯᄂ":"ll","ᆯᄅ":"ll","ᆰ":"k","ᆰᄋ":"lg","ᆰᄂ":"ngn","ᆰᄅ":"ngn","ᆰᄆ":"ngm","ᆰᄒ":"lkh","ᆱ":"m","ᆱᄋ":"lm","ᆱᄂ":"mn","ᆱᄅ":"mn","ᆱᄆ":"mm","ᆱᄒ":"lmh","ᆲ":"p","ᆲᄋ":"lb","ᆲᄂ":"mn","ᆲᄅ":"mn","ᆲᄆ":"mm","ᆲᄒ":"lph","ᆳ":"t","ᆳᄋ":"ls","ᆳᄂ":"nn","ᆳᄅ":"nn","ᆳᄆ":"nm","ᆳᄒ":"lsh","ᆴ":"t","ᆴᄋ":"lt","ᆴᄂ":"nn","ᆴᄅ":"nn","ᆴᄆ":"nm","ᆴᄒ":"lth","ᆵ":"p","ᆵᄋ":"lp","ᆵᄂ":"mn","ᆵᄅ":"mn","ᆵᄆ":"mm","ᆵᄒ":"lph","ᆶ":"l","ᆶᄋ":"lh","ᆶᄂ":"ll","ᆶᄅ":"ll","ᆶᄆ":"lm","ᆶᄒ":"lh","ᆷ":"m","ᆷᄅ":"mn","ᆸ":"p","ᆸᄋ":"b","ᆸᄂ":"mn","ᆸᄅ":"mn","ᆸᄆ":"mm","ᆸᄒ":"ph","ᆹ":"p","ᆹᄋ":"ps","ᆹᄂ":"mn","ᆹᄅ":"mn","ᆹᄆ":"mm","ᆹᄒ":"psh","ᆺ":"t","ᆺᄋ":"s","ᆺᄂ":"nn","ᆺᄅ":"nn","ᆺᄆ":"nm","ᆺᄒ":"sh","ᆻ":"t","ᆻᄋ":"ss","ᆻᄂ":"tn","ᆻᄅ":"tn","ᆻᄆ":"nm","ᆻᄒ":"th","ᆼ":"ng","ᆽ":"t","ᆽᄋ":"j","ᆽᄂ":"nn","ᆽᄅ":"nn","ᆽᄆ":"nm","ᆽᄒ":"ch","ᆾ":"t","ᆾᄋ":"ch","ᆾᄂ":"nn","ᆾᄅ":"nn","ᆾᄆ":"nm","ᆾᄒ":"ch","ᆿ":"k","ᆿᄋ":"k","ᆿᄂ":"ngn","ᆿᄅ":"ngn","ᆿᄆ":"ngm","ᆿᄒ":"kh","ᇀ":"t","ᇀᄋ":"t","ᇀᄂ":"nn","ᇀᄅ":"nn","ᇀᄆ":"nm","ᇀᄒ":"th","ᇁ":"p","ᇁᄋ":"p","ᇁᄂ":"mn","ᇁᄅ":"mn","ᇁᄆ":"mm","ᇁᄒ":"ph","ᇂ":"t","ᇂᄋ":"h","ᇂᄂ":"nn","ᇂᄅ":"nn","ᇂᄆ":"mm","ᇂᄒ":"t","ᇂᄀ":"k"}}
    const cyrillicDict = {"а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"yo","ж":"zh","з":"z","и":"i","й":"j","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"h","ц":"c","ч":"ch","ш":"sh","щ":"sch","ъ":"","ы":"y","ь":"j","э":"e","ю":"yu","я":"ya"}
    const hybrewDict = {"א":"a","ב":"b","ג":"g","ד":"d","ה":"h","ו":"v","ז":"z","ח":"ch","ט":"t","י":"y","כ":"k","ך":"k","ל":"l","מ":"m","ם":"m","נ":"n","ן":"n","ס":"s","ע":"a","פ":"p","ף":"p","צ":"ts","ץ":"ts","ק":"k","ר":"r","ש":"sh","ת":"t"}
    let language = {
        'korean': 0,
        'cyrillic': 0,
        'hybrew': 0,
        'roman': 0
    }
    let fullResult:string[] = []

    for(const text of texts){
        let result = ''
        for(let i = 0; i < text.length; i++){
            const char = text[i]

            //hangul
            if(/[\u3131-\u314e|\u314f-\u3163|\uac00-\ud7a3]/.test(char)){
                const code = char.normalize('NFD')
                let text = ''
                text += koreanDict.cho[code[0]]
                if(code.length >= 2){
                    text += koreanDict.jung[code[1]]
                }
                if(code.length === 3){
                    text += koreanDict.jong[code[2]]
                }
                language.korean++
                continue
            }

            //cyrillic
            if(cyrillicDict[char]){
                result += cyrillicDict[char]
                language.cyrillic++
                continue
            }

            //hybrew
            if(hybrewDict[char]){
                result += hybrewDict[char]
                language.hybrew++
                continue
            }

            //roman
            if(/[a-zA-Z]/.test(char)){
                result += char
                language.roman++
                continue
            }
        }
        fullResult.push(result)
    }

    const mostUsed = Object.keys(language).reduce((a, b) => language[a] > language[b] ? a : b)

    return {
        'result': fullResult,
        'mostUsed': mostUsed
    }
}