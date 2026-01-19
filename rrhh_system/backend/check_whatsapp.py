import requests
import json

# Datos extraídos de tu configuración
WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0'
WHATSAPP_TOKEN = 'EAAb2nFjASUgBQYhzGcPhnZBuY2MVPZCRO05RJ4PZBPLbZAzpkevPvZCovOY8CfQheB5xMOYyZB9MIKlBbja4Fo1vc9FMiZCbExIqt2VlaC4OytLAcLnIx4j4dnbB9KC9H90LXuUarEPHek5ia8SIhjAMZAiiYPyy2sQpibZASZCw3pjnuZAS1Ac7bRYtiwa1j90mAZDZD'
WHATSAPP_PHONE_ID = '979242931933281'
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
