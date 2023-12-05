
const convertion:[string,string,number, boolean][] = [
    ['kg', 'lbs', 2.20462, true],
    ['m', 'ft', 3.28084, true],
    ['cm', 'inch', 0.393701, false],
    ['mm', 'inch', 0.0393701, false],
    ['km', 'mi', 0.621371, true],
    ['killogram', 'pound', 2.20462, true],
    ['meter', 'foot', 3.28084, true],
    ['centimeter', 'inch', 0.393701, true],
    ['millimeter', 'inch', 0.0393701, true],
    ['kilometer', 'mile', 0.621371, true],
]

export function metricaPlugin(data:string, toSystem:'metrics'|'imperial'){
    const c = convertion.sort((a,b) => b[0].length - a[0].length);    
    for(let i = 0; i < c.length; i++){
        let [from, to, ratio] = c[i];
        if(toSystem !== 'imperial'){
            [from, to] = [to, from];
            ratio = 1 / ratio;
        }
        if(!c[i][3]){
            if(toSystem === 'metrics'){
                continue;
            }
        }
        const reg = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${from}`, 'g');
        data = data.replace(reg, (_, value) => {
            // if value is integer, parse it as integer
            if(value.indexOf('.') === -1){
                const result = parseInt(value) * ratio
                return `${result.toFixed(0)} ${to}`;
            }

            const result = parseFloat(value) * ratio;
            return `${result.toFixed(2)} ${to}`;
        });
    }
    //convert height like 5' 11'' to 180 cm
    const reg = /(\d+)'\s*(\d+)"/g;
    data = data.replace(reg, (_, feet, inch) => {
        const result = parseFloat(feet) * 30.48 + parseFloat(inch) * 2.54;
        return `${result.toFixed(2)} cm`;
    });
    
    return data
}