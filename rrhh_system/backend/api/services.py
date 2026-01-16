import requests
import json
from django.conf import settings

def send_whatsapp_message(phone_number, message_text):
    """
    Sends a WhatsApp message using the WhatsApp Business Cloud API.
    
    Args:
        phone_number (str): The recipient's phone number.
        message_text (str): The body of the message.
        
    Returns:
        dict: The JSON response from the API or None if failed.
    """
    if not settings.WHATSAPP_TOKEN or not settings.WHATSAPP_PHONE_ID:
        print("WhatsApp credentials not configured.")
        return None

    # Sanitizar número (debe ser solo dígitos y empezar con código de país, ej: 591 para Bolivia)
    # Asumimos que si no tiene código, es un número local de Bolivia
    clean_number = ''.join(filter(str.isdigit, str(phone_number)))
    if len(clean_number) == 8: # Número típico de Bolivia
        clean_number = '591' + clean_number

    print(f"DEBUG: Intentando enviar WhatsApp a {clean_number} (Original: {phone_number})")

    url = f"{settings.WHATSAPP_API_URL}/{settings.WHATSAPP_PHONE_ID}/messages"
    
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # 1. Intentar enviar mensaje de texto libre
    payload_text = {
        "messaging_product": "whatsapp",
        "to": clean_number,
        "type": "text",
        "text": { "body": message_text }
    }

    try:
        response = requests.post(url, headers=headers, json=payload_text)
        response.raise_for_status()
        print(f"✅ WhatsApp (Texto) enviado exitosamente a {clean_number}")
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"⚠️ Error enviando mensaje de texto a {clean_number}: {e}")
        if hasattr(e, 'response') and e.response is not None:
             print(f"   Detalle Error Meta: {e.response.text}")

        # 2. Fallback: Intentar enviar Template 'hello_world' (útil para pruebas/inicio de charla)
        print("🔄 Intentando fallback con template 'hello_world'...")
        payload_template = {
            "messaging_product": "whatsapp",
            "to": clean_number,
            "type": "template",
            "template": { 
                "name": "hello_world", 
                "language": { "code": "en_US" } 
            }
        }
        try:
            response_t = requests.post(url, headers=headers, json=payload_template)
            response_t.raise_for_status()
            print(f"✅ WhatsApp (Template hello_world) enviado exitosamente a {clean_number}")
            return response_t.json()
        except requests.exceptions.RequestException as e2:
             print(f"❌ Error final enviando WhatsApp: {e2}")
             if hasattr(e2, 'response') and e2.response is not None:
                print(f"   Detalle Error Meta (Template): {e2.response.text}")
             return None
