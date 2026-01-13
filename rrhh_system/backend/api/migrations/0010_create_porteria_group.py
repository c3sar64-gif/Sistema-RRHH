from django.db import migrations

def create_porteria_group(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Group.objects.get_or_create(name='Porteria')

def remove_porteria_group(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Group.objects.filter(name='Porteria').delete()

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_alter_permiso_fecha_solicitud'),
    ]

    operations = [
        migrations.RunPython(create_porteria_group, remove_porteria_group),
    ]
