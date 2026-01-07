from django.core.management.base import BaseCommand
from api.models import Cargo

class Command(BaseCommand):
    help = 'Shows all existing positions (cargos) from the database'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Reading all positions from the database...'))
        
        cargos = Cargo.objects.all().order_by('nombre')
        
        if cargos.exists():
            self.stdout.write(self.style.SUCCESS(f'Found {cargos.count()} positions:'))
            for i, cargo in enumerate(cargos):
                self.stdout.write(f'  {i+1}. {cargo.nombre}')
        else:
            self.stdout.write(self.style.WARNING('No positions found in the database.'))
        
        self.stdout.write(self.style.SUCCESS('\nFinished.'))
