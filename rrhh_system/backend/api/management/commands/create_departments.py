from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Departamento

class Command(BaseCommand):
    help = 'Creates a list of predefined departments in the database'

    DEPARTMENTS = [
        "Adm. Calidad",
        "Adm. Comercial",
        "Adm. Sistemas",
        "Adm.y Contabilidad",
        "Almacen",
        'ALMACEN "LA GRANJA"',
        "Almacen de Materiales Y Maples",
        "Granja Tiquipaya 4",
        "Integracion",
        "Limpieza y Mtto. Tiquipaya",
        "Logistica Ayudantes Choferes",
        "Logistica Carguio y Descarguio",
        "Logistica Tiquipaya",
        "Molino",
        "RRHH",
        "Selección",
        "Logistica Choferes",
    ]

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write('Creating departments inside a transaction...')
        count = 0
        for dept_name in self.DEPARTMENTS:
            obj, created = Departamento.objects.get_or_create(nombre=dept_name)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Successfully created department: "{obj.nombre}"'))
                count += 1
            else:
                self.stdout.write(self.style.WARNING(f'Department already exists: "{obj.nombre}"'))
        
        self.stdout.write(self.style.SUCCESS(f'\nFinished. Created {count} new departments.'))