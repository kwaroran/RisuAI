import { getChatVar } from "../parser";

function toRPN(expression:string) {
    let outputQueue = '';
    let operatorStack = [];
    let operators = {
        '+': {precedence: 2, associativity: 'Left'},
        '-': {precedence: 2, associativity: 'Left'},
        '*': {precedence: 3, associativity: 'Left'},
        '/': {precedence: 3, associativity: 'Left'},
        '^': {precedence: 4, associativity: 'Left'},
        '%': {precedence: 3, associativity: 'Left'},
        '<': {precedence: 1, associativity: 'Left'},
        '>': {precedence: 1, associativity: 'Left'},
    };

    expression = expression.replace(/\s+/g, '');
    let expression2 = expression.split(/([\+\-\*\/\^\%\>\<])/).filter(token => token);

    expression2.forEach(token => {
        if (parseFloat(token) || token === '0') {
            outputQueue += token + ' ';
        } else if ('+-*/^%><'.includes(token)) {
            while (operatorStack.length > 0 &&
            ((operators[token].associativity === 'Left' &&
            operators[token].precedence <= operators[operatorStack[operatorStack.length - 1]].precedence) ||
            (operators[token].associativity === 'Right' &&
            operators[token].precedence < operators[operatorStack[operatorStack.length - 1]].precedence))) {
                outputQueue += operatorStack.pop() + ' ';
            }

            operatorStack.push(token);
        }
    });

    while (operatorStack.length > 0) {
        outputQueue += operatorStack.pop() + ' ';
    }

    return outputQueue.trim();
}

function calculateRPN(expression:string) {
    let stack:number[] = [];

    expression.split(' ').forEach(token => {
        if (parseFloat(token) || token === '0') {
            stack.push(parseFloat(token));
        } else {
            let [b, a] = [stack.pop(), stack.pop()];
            switch (token) {
                case '+': stack.push(a + b); break;
                case '-': stack.push(a - b); break;
                case '*': stack.push(a * b); break;
                case '/': stack.push(a / b); break;
                case '^': stack.push(a ** b); break;
                case '%': stack.push(a % b); break;
                case '<': stack.push(a < b ? 1 : 0); break;
                case '>': stack.push(a > b ? 1 : 0); break;
            }
        }
    });

    if(stack.length === 0){
        return 0
    }

    return stack.pop()
}

function executeRPNCalculation(text:string) {
    text = text.replace(/\$([a-zA-Z0-9_]+)/g, (_, p1) => {
        const v = getChatVar(p1)
        const parsed = parseFloat(v)
        if(isNaN(parsed)){
            return "0"
        }
        return parsed.toString()
    })
    const expression = toRPN(text);
    const evaluated = calculateRPN(expression);
    return evaluated
}

export function calcString(text:string) {
    let depthText:string[] = ['']

    for(let i = 0; i < text.length; i++) {
        if(text[i] === '(') {
            depthText.push('')
        }
        else if(text[i] === ')' && depthText.length > 1) {
            let result = executeRPNCalculation(depthText.pop())
            depthText[depthText.length - 1] += result
        }
        else {
            depthText[depthText.length - 1] += text[i]
        }
    }

    return executeRPNCalculation(depthText.join(''))
}
