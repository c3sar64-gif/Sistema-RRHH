import requests
import json

# Datos extraídos de tu configuración
WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0'
WHATSAPP_TOKEN = 'EAAb2nFjASUgBQQiurdny2UwpxQmvtbFndRZCG2FOEV1k1TGdLz7Fswcj9dd5SRRvbNzUaF6JDbY7MZAvBAZCNu7mQqnEv1REayIZBy0jSpHkJZCdSDyRFCnYcFS2QQFHLZAf2aFLqlYGvU9QwTokpP9UNkv4gzwRq7zNqhD3p9ZBqAAL4rWfH9PtNm49zkCUZAdHrci0cBxeiMLcelO9IZBM0fZBc858ZCReyJDVEEPsdIRYp0pQIP9ZCgp0DeOdgWE5zY2eExozio6D6khhJcvQ6W8cpAZDZD'
WHATSAPP_PHONE_ID = '984108238113553'
TEST_PHONE_NUMBER = '59171499575'

def test_send():
    url = f"{WHATSAPP_API_URL}/{WHATSAPP_PHONE_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Payload Template (igual al curl)
    payload = {
        "messaging_product": "whatsapp",
        "to": TEST_PHONE_NUMBER,
        "type": "template",
        "template": { 
            "name": "hello_world", 
            "language": { "code": "en_US" } 
        }
    }

    print(f"Enviando request a: {url}")
    try:
        response = requests.post(url, headers=headers, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_send()
