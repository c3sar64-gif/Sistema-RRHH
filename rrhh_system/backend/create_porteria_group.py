import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_system.settings')
django.setup()

from django.contrib.auth.models import Group

def create_porteria_group():
    group, created = Group.objects.get_or_create(name='Porteria')
    if created:
        print("Success: Group 'Porteria' was created.")
    else:
        print("Info: Group 'Porteria' already exists.")

if __name__ == "__main__":
    create_porteria_group()
