import os
import django
from django.core.mail import send_mail
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_backend.settings')
django.setup()

print("Setting up Django...")
print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
# Don't print password

try:
    print("Attempting to send email...")
    send_mail(
        'Prueba de SMTP Racion de Hormigas',
        'Si ves este mensaje, la configuración SMTP funciona correctamente.',
        settings.EMAIL_HOST_USER,
        ['app.rolon.bolivia@gmail.com'], # Enviar a sí mismo para prueba
        fail_silently=False,
    )
    print("✅ Correo enviado exitosamente (Segun send_mail). Revisa tu bandeja.")
except Exception as e:
    print(f"❌ Error al enviar correo: {e}")
