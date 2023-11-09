//The @use comment tells the program what callable functions exist. If you omit this, the function will not be called.

//@use editInput
//@use editOutput
//@use editProcess
//@use editDisplay
//@use onButtonClick



async function editInput(text){
    //editInput is a callable function that is called when the user inputs text into the input box.
    //the first argument is the text that the user input.
    //the text would replaced to return value, which would change the real value.
    return text;
}

async function editOutput(text){
    //editOutput is a callable function that is called when bot outputs text.
    //the first argument is the text that the bot outputs.
    //the text would replaced to return value, which would change the real value.
    return text;
}

async function editProcess(text){
    //editOutput is a callable function that is called when before request.
    //the first argument is the original text.
    //the text would replaced to return value and used in request, but it would not change the real value.
    return text;
}

async function editDisplay(text){
    //editDisplay is a callable function that is called when before display.
    //the first argument is the original text.
    //the text would replaced to return value and be displayed, but it would not change the real value.
    return text
}

async function onButtonClick(code){
    //onButtonClick is a callable function that is called when the user clicks the button.
    //a button is a html element that has the attribute "risu-btn".
    //the first argument is the code of the button.
    //example: <button risu-btn="example-char">button</button> uses "example-char" as the code.
    //return value is not used.
    return
}


async function showcase(){
    //this is a function for just introducing the apis.
    

    //getChat() returns the chat object.
    const chat = await getChat()

    //setChat(chat) sets the chat object.
    //must be a valid chat object.
    //returns true if success, false if failed.
    await setChat(chat)

    //getName() returns the name of the character.
    const name = await getName()

    //setName(name) sets the name of the character.
    //must be a valid string.
    //returns true if success, false if failed.
    await setName(name)

    //getDescription() returns the description of the character.
    const description = await getDescription()

    //setDescription(description) sets the description of the character.
    //must be a valid string.
    //returns true if success, false if failed.
    await setDescription(description)

    //getCharacterFirstMessage() returns the first message of the character.
    const firstMessage = await getCharacterFirstMessage()

    //setCharacterFirstMessage(firstMessage) sets the first message of the character.
    //must be a valid string.
    //returns true if success, false if failed.
    await setCharacterFirstMessage(firstMessage)



    //setState(stateName, data) sets the states of the character.
    //states are used to store data, because the data would be lost every time when function is called.
    //if data is string, it must be less or equal to 100000 characters.
    //stateName must be a valid string.
    //data must be a valid string, number or boolean.
    //returns true if success, false if failed.
    await setState("somedata", "data")
    await setState("anotherdata", 123)

    //getState(stateName) returns the state of the character.
    //stateName must be a valid string.
    //returns the data if success, null if failed.
    const data = await getState("somedata")
    const anotherdata = await getState("anotherdata")
}


// --- additional notes
// the code are parsed everytime, so complex codes would slow down the program.
// the function must be return in 400ms, or it would be timeout.
// for security reasons, you can only access limited apis.