
const convertion:[string,string,number][] = [
    ['kg', 'lbs', 2.20462],
    ['m', 'ft', 3.28084],
    ['cm', 'in', 0.393701],
    ['mm', 'in', 0.0393701],
    ['km', 'mi', 0.621371],
    ['killogram', 'pound', 2.20462],
    ['meter', 'foot', 3.28084],
    ['centimeter', 'inch', 0.393701],
    ['millimeter', 'inch', 0.0393701],
    ['kilometer', 'mile', 0.621371],
]

export function metricaPlugin(data:string, toSystem:'metrics'|'imperial'){
    const c = convertion.sort((a,b) => b[0].length - a[0].length);    

    for(let i=0;i<data.length;i++){
        function extractNumber(data:string, i:number){
            let number = '';
            while(i > 0){
                i--;
                if(data[i] === ' ' || data[i] === '\n' || data[i] === '\t' || data[i] === ','){
                    continue
                }
                if(data[i] === '.'){
                    number = '.' + number;
                    continue;
                }
                if(isNaN(Number(data[i]))){
                    break;
                }
                number = data[i] + number;
            }
            i++
            while(data[i] === ' ' || data[i] === '\n' || data[i] === '\t' || data[i] === ','){
                i++;
            }
            return {
                number: number === '' ? 0 : Number(number),
                index: i
            };
        }

        let sub = ''
        let sublen = 0;
        for(let j=0;j<c.length;j++){
            const [from, to, ratio] = (toSystem === 'imperial') ? c[j] : [c[j][1], c[j][0], 1/c[j][2]];
            if(sublen !== from.length){
                sub = data.substring(i,i+from.length)
                sublen = from.length;
            }
            if(sub === from){
                const n = extractNumber(data, i);
                if(n .number !== 0){
                    const num = (n.number * ratio)
                    const rto = (num >= 1) ? num.toFixed(0) : num.toFixed(1);
                    const newData = data.substring(0, n.index) + rto + ' ' + to + data.substring(i+from.length);
                    const offset = newData.length - data.length;
                    i += offset;
                    data = newData;
                }
            }
        }

    }
    return data
}