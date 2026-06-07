def serialize_chat(chat):
    return {
        "id": str(chat["_id"]),
        "title": chat["title"]
    }

def serialize_message(msg):
    return {
        "id": str(msg["_id"]),
        "chatId": str(msg["chatId"]),
        "text": msg["text"],
        "isUser": msg["isUser"]
    }