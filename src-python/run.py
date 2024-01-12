import uvicorn
import os
import uuid
import subprocess
import sys

if __name__ == "__main__":
    key_dir = os.path.join(os.getcwd(), "key.txt")
    with open(key_dir, "w") as f:
        f.write(uuid.uuid4().hex)
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pydantic"])
    subprocess.check_call([sys.executable, "-m", "pip", "install", "llama-cpp-python"])
    uvicorn.run("main:app", host="0.0.0.0", port=8912)