def serialize_chat(chat):
    return {
        "id": str(chat["_id"]),
        "title": chat["title"]
    }

def serialize_message(msg):
    serialized = {
        "id": str(msg["_id"]),
        "chatId": str(msg["chatId"]),
        "text": msg["text"],
        "isUser": msg["isUser"],
    }

    if msg.get("fileName"):
        serialized["fileName"] = msg["fileName"]
    if msg.get("fileType"):
        serialized["fileType"] = msg["fileType"]
    if msg.get("fileUrl"):
        serialized["fileUrl"] = msg["fileUrl"]

    return serialized