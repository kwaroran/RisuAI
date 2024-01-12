from fastapi import FastAPI, Header
from fastapi.responses import StreamingResponse
from llamacpp import LlamaItem, stream_chat_llamacpp
from typing import Annotated, Union
import os

app = FastAPI()
key_dir = os.path.join(os.getcwd(), "key.txt")
f = open(key_dir, 'r')
key = f.read()
f.close()

@app.post("/llamacpp")
async def llamacpp(item:LlamaItem, x_risu_auth: Annotated[Union[str, None], Header()] = None):
    if key != x_risu_auth:
        return {"error": "Invalid key"}
    return StreamingResponse(stream_chat_llamacpp(item))

@app.get("/")
async def autha():
    return {"dir": key_dir}

@app.get("/auth")
async def auth():
    return {"dir": key_dir}