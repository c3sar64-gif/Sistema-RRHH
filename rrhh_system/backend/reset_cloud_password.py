
import os
import django
from pathlib import Path

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_backend.settings')
django.setup()

from django.contrib.auth.models import User
from django.conf import settings

def reset_password():
    print(f"--- Diagnóstico de Usuario ---")
    print(f"Base de datos configurada: {settings.DATABASES['default']['NAME']}")
    print(f"Host: {settings.DATABASES['default']['HOST']}")
    
    username = 'Rolon'
    new_pass = 'Rolon2025'
    
    try:
        user = User.objects.get(username=username)
        print(f"\n[OK] Usuario '{username}' ENCONTRADO.")
        
        print(f"Estado actual:")
        print(f" - is_active: {user.is_active}")
        print(f" - is_staff: {user.is_staff}")
        print(f" - is_superuser: {user.is_superuser}")
        
        if not user.is_active:
            print(" -> El usuario estaba INACTIVO. Activando...")
            user.is_active = True
            
        print(f"\nEstableciendo nueva contraseña a: '{new_pass}' ...")
        user.set_password(new_pass)
        user.save()
        
        print(f"\n✅ ¡ÉXITO! Contraseña restablecida correctamente.")
        print("Intenta iniciar sesión de nuevo en la web.")
        
    except User.DoesNotExist:
        print(f"\n[ERROR] El usuario '{username}' NO EXISTE en esta base de datos.")
        print("Usuarios existentes:")
        for u in User.objects.all():
            print(f" - {u.username}")

if __name__ == '__main__':
    try:
        reset_password()
    except Exception as e:
        print(f"\n[FATAL ERROR]: {e}")
