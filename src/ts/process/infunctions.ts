
function toRPN(expression:string) {
    let outputQueue = '';
    let operatorStack = [];
    let operators = {
        '+': {precedence: 2, associativity: 'Left'},
        '-': {precedence: 2, associativity: 'Left'},
        '*': {precedence: 3, associativity: 'Left'},
        '/': {precedence: 3, associativity: 'Left'}
    };

    expression = expression.replace(/\s+/g, '');
    let expression2 = expression.split(/([\+\-\*\/])/).filter(token => token);

    expression2.forEach(token => {
        if (parseFloat(token) || token === '0') {
            outputQueue += token + ' ';
        } else if ('+-*/'.includes(token)) {
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
            }
        }
    });

    return stack.pop();
}

export function calcString(args:string) {
    const expression = toRPN(args);
    const evaluated = calculateRPN(expression);
    return evaluated
}
