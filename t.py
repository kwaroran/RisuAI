
En2De = {
    "hello": "Hallo",
    "world": "Welt",
    "python": "Python",
    "is": "ist",
    "a": "ein",
    "programming": "Programmier",
    "language": "Sprache",
    "that": "das",
    "lets": "lässt",
    "you": "dich",
    "work": "arbeiten",
    "quickly": "schnell",
    "and": "und",
    "integrate": "integrieren",
    "systems": "Systeme",
    "more": "mehr",
    "effectively": "effektiv",
}

def translate(text):
    return " ".join(En2De.get(word, word) for word in text.split())

if __name__ == "__main__":
    text = "hello world python is a programming language that lets you work quickly and integrate systems more effectively"
    print(translate(text))


