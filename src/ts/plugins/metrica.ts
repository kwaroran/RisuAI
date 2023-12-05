
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
    for(let i = 0; i < c.length; i++){
        let [from, to, ratio] = c[i];
        if(toSystem !== 'imperial'){
            [from, to] = [to, from];
            ratio = 1 / ratio;
        }
        const reg = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${from}`, 'g');
        data = data.replace(reg, (_, value) => {
            const result = parseFloat(value) * ratio;
            return `${result.toFixed(2)} ${to}`;
        });
    }
    
    return data
}