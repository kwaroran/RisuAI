from llama_cpp import Llama
from pydantic import BaseModel

class LlamaItem(BaseModel):
    prompt: str
    model_path: str
    temperature: float = 0.2,
    top_p: float = 0.95,
    top_k: int = 40,
    max_tokens: int = 256,
    presence_penalty: float = 0,
    frequency_penalty: float = 0,
    repeat_penalty: float = 1.1,
    n_ctx: int = 2000

def stream_chat_llamacpp(item:LlamaItem):
    if last_model_path != item.model_path or llm is None or n_ctx != item.n_ctx:
        llm = Llama(model_path=item.model_path, n_ctx=n_ctx)
        last_model_path = item.model_path
        n_ctx = item.n_ctx
    chunks = llm.create_completion(
        prompt = item.prompt,
    )
    for chunk in chunks:
        cont = chunk
        print(cont, end="")
        yield cont.encode()

n_ctx = 2000
last_model_path = ""
llm:Llama