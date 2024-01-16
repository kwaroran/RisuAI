from fastapi import FastAPI, Header
from fastapi.responses import StreamingResponse
from llama_cpp import Llama, CompletionChunk
from pydantic import BaseModel
from typing import Annotated, Union, List
from fastapi.middleware.cors import CORSMiddleware
import uuid
import os
import sys

# Write key for authentication

app = FastAPI()
key_dir = os.path.join(os.path.dirname(sys.executable), "key.txt")
if not os.path.exists(key_dir):
    f = open(key_dir, 'w')
    f.write(str(uuid.uuid4()))
    f.close()
f = open(key_dir, 'r')
key = f.read()
f.close()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication endpoint

@app.get("/")
async def autha():
    return {"dir": key_dir}

@app.get("/auth")
async def auth():
    return {"dir": key_dir}


# Llamacpp endpoint

class LlamaItem(BaseModel):
    prompt: str
    model_path: str
    temperature: float
    top_p: float
    top_k: int
    max_tokens: int
    presence_penalty: float
    frequency_penalty: float
    repeat_penalty: float
    n_ctx: int
    stop: List[str]

app.n_ctx = 2000
app.last_model_path = ""
app.llm:Llama = None


def stream_chat_llamacpp(item:LlamaItem):
    if app.last_model_path != item.model_path or app.llm is None or app.n_ctx != item.n_ctx:
        app.llm = Llama(model_path=item.model_path, n_ctx=app.n_ctx + 200)
        app.last_model_path = item.model_path
        app.n_ctx = item.n_ctx
    chunks = app.llm.create_completion(
        prompt = item.prompt,
        temperature = item.temperature,
        # top_p = item.top_p,
        # top_k = item.top_k,
        # max_tokens = item.max_tokens,
        # presence_penalty = item.presence_penalty,
        # frequency_penalty = item.frequency_penalty,
        # repeat_penalty = item.repeat_penalty,
        # stop=item.stop,
        stream=False,
    )
    if(type(chunks) == str):
        print(chunks, end="")
        yield chunks
        return
    if(type(chunks) == bytes):
        print(chunks.decode('utf-8'), end="")
        yield chunks.decode('utf-8')
        return
    if(type(chunks) == dict and "choices" in chunks):
        print(chunks["choices"][0]["text"], end="")
        yield chunks["choices"][0]["text"]
        return

    for chunk in chunks:
        if(type(chunk) == str):
            print(chunk, end="")
            yield chunk
            continue
        if(type(chunk) == bytes):
            print(chunk.decode('utf-8'), end="")
            yield chunk.decode('utf-8')
            continue
        cont:CompletionChunk  = chunk
        print(cont)
        encoded = cont["choices"][0]["text"]
        print(encoded, end="")
        yield encoded

@app.post("/llamacpp")
async def llamacpp(item:LlamaItem, x_risu_auth: Annotated[Union[str, None], Header()] = None) -> StreamingResponse:
    if key != x_risu_auth:
        return {"error": "Invalid key"}
    return StreamingResponse(stream_chat_llamacpp(item))

class LlamaTokenizeItem(BaseModel):
    prompt: str
    model_path: str
    n_ctx: int

@app.post("/llamacpp/tokenize")
async def llamacpp_tokenize(item:LlamaTokenizeItem, x_risu_auth: Annotated[Union[str, None], Header()] = None) -> List[int]:
    if key != x_risu_auth:
        return {"error": "Invalid key"}
    if app.last_model_path != item.model_path or app.llm is None or app.n_ctx != item.n_ctx:
        app.llm = Llama(model_path=item.model_path, n_ctx=app.n_ctx + 200)
        app.last_model_path = item.model_path
        app.n_ctx = item.n_ctx

    return app.llm.tokenize(item.prompt.encode('utf-8'))