from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Cargo

class Command(BaseCommand):
    help = 'Creates a list of predefined positions (cargos) in the database'

    CARGOS = [
        "ALMACEN", "ANALISTA DE INTEGRACION COMERCIAL", "ASISTENTE ADMINISTRATIVO",
        "ASISTENTE CONTABLE", "ASISTENTE DE CALIDAD", "AUX. ALMACEN",
        "AUX.CUENTAS POR PAGAR", "AUXILIAR ADMINISTRATIVA TRAMITES", "AUXILIAR CONTABLE",
        "AUXILIAR CONTABLE MOLINO", "AUXILIAR DE PRODUCCION", "AUXILIAR SELECCION",
        "AYUDANTE", "AYUDANTE DE CHOFERES", "AYUDANTE DE ALMACEN", "CAJERO", "CHOFER",
        "COSTURERO", "DESCARGADORES HUEVO", "ENC. LOGISTICA CAMPO",
        "ENCARGADA DE ALMACEN", "ENCARGADA DE COMPRAS", "ENCARGADO DE ALMACEN",
        "GERENTE ADMINISTRATIVO", "GERENTE DE INTEGRACION COMERCIAL", "GALPONERO",
        "HUESERIA", "JEFE DE ADMINISTRACION", "JEFE DE CONTABILIDAD",
        "JEFE DE SISTEMAS", "JARDINERO", "MANTENIMINETO", "MOLINERO",
        "PERSONAL DE LIMPIEZA", "PORTERO", "RECEP. DE NOTAS", "RECOLECTORA DE HUEVO",
        "RESP. CTAS POR COBRAR", "RESP. DISEÑO MARKETING Y PUBLICIDAD",
        "SELECCIONADOR", "SELECCIONADORA", "T2 ECHADOR", "AUXLIAR RECURSOS HUMANOS",
        "ASIST. ALMACEN HUEVOS", "TRACTORISTA", "ENC. SELECCION", "LAVADERO",
        "GERENCIA", "GERENTE DE PRODUCCION", "DESARROLLADOR"
    ]

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write('Creating positions (cargos)...')
        count = 0
        for cargo_name in self.CARGOS:
            obj, created = Cargo.objects.get_or_create(nombre=cargo_name)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Successfully created position: "{obj.nombre}"'))
                count += 1
            else:
                self.stdout.write(self.style.WARNING(f'Position already exists: "{obj.nombre}"'))
        
        self.stdout.write(self.style.SUCCESS(f'\nFinished. Created {count} new positions.'))
