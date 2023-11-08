//@use editInput
//@use editOutput
//@use editProcess
//@use editDisplay
//@use onButtonClick

async function editInput(text){
    return text;
}

async function editOutput(text){
    return text;
}

async function editProcess(text){
    return text;
}

async function onButtonClick(code){
    let fm = await getCharacterFirstMessage()

    if(code === 'calculate'){
        fm = calculateString(fm)
    }
    else if(code === 'clearResult'){
        fm = '0';
    }
    else if(code.startsWith("click")){
        fm += code.substring(5);
    }
    else{
        fm += code;
    }
    setCharacterFirstMessage(fm);

}


function calculateString(input) {
    let numbers = input.split(/\+|\-|\*|\//).map(Number);
    let operators = input.split(/[0-9]+/).filter(Boolean);
  
    let result = numbers[0];
  
    for (let i = 0; i < operators.length; i++) {
        switch (operators[i]) {
            case '+':
                result += numbers[i + 1];
                break;
            case '-':
                result -= numbers[i + 1];
                break;
            case '*':
                result *= numbers[i + 1];
                break;
            case '/':
                result /= numbers[i + 1];
                break;
            default:
                return "Error: Invalid operator";
        }
    }
      return result.toFixed(1);
}

async function editDisplay(text){
    return `
<div class="calculator">
        <div class="result" id="result">${text}</div>
        <button class="btn" risu-btn="click7">7</button>
        <button class="btn" risu-btn="click8">8</button>
        <button class="btn" risu-btn="click9">9</button>
        <button class="btn operator" risu-btn="+">+</button>
        <button class="btn" risu-btn="click4">4</button>
        <button class="btn" risu-btn="click5">5</button>
        <button class="btn" risu-btn="click6">6</button>
        <button class="btn operator" risu-btn="-">-</button>
        <button class="btn" risu-btn="click1">1</button>
        <button class="btn" risu-btn="click2">2</button>
        <button class="btn" risu-btn="click3">3</button>
        <button class="btn operator" risu-btn="*">*</button>
        <button class="btn" risu-btn="click0">0</button>
        <button class="btn" onclick="clearResult">C</button>
        <button class="btn operator" risu-btn="calculate">=</button>
        <button class="btn operator" risu-btn="/">/</button>
    </div>
    <style>
      body {
        font-family: Arial, sans-serif;
      }
    
      .calculator {
        max-width: 300px;
        margin: 0 auto;
        border: 1px solid #ccc;
        border-radius: 5px;
        padding: 10px;
        background-color: #f9f9f9;
      }
    
      .result {
        font-size: 24px;
        text-align: right;
        margin-bottom: 10px;
        padding: 5px;
        border: 1px solid #ccc;
        border-radius: 5px;
        width: 100%;
      }
    
      .btn {
        font-size: 18px;
        padding: 10px;
        margin: 5px;
        width: 45px;
        border: 1px solid #ccc;
        border-radius: 5px;
        cursor: pointer;
        color:black;
      }
    
      .btn:hover {
        background-color: #ddd;
      }
    
      .btn.operator {
        background-color: #ff9800;
        color: #fff;
      }
    </style>
    `;
}

async function edit(text){
    return text;

}