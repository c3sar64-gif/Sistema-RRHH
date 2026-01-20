
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_backend.settings')
django.setup()

from django.contrib.auth.models import User, Group

def fix_permissions():
    username = 'Rolon'
    try:
        user = User.objects.get(username=username)
        print(f"Usuario found: {user.username}")
        
        # 1. Make Superuser/Staff
        user.is_staff = True
        user.is_superuser = True
        user.save()
        print(f" -> Set is_staff=True, is_superuser=True")
        
        # 2. Ensure Groups exist
        groups_to_check = ['Admin', 'RRHH', 'Encargado', 'Jefe de Departamento', 'Porteria']
        for g_name in groups_to_check:
            group, created = Group.objects.get_or_create(name=g_name)
            if created:
                print(f" -> Group '{g_name}' created.")
            else:
                print(f" -> Group '{g_name}' exists.")
                
        # 3. Add to Admin group
        admin_group = Group.objects.get(name='Admin')
        user.groups.add(admin_group)
        print(f" -> Added {username} to 'Admin' group.")
        
        rrhh_group = Group.objects.get(name='RRHH')
        user.groups.add(rrhh_group)
        print(f" -> Added {username} to 'RRHH' group.")
        
        print("\n✅ Permissions fixed successfully for Rolon.")
        
    except User.DoesNotExist:
        print(f"User {username} not found.")

if __name__ == '__main__':
    fix_permissions()
