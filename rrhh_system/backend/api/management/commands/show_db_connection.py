from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Shows the active database connection parameters'

    def handle(self, *args, **options):
        settings_dict = connection.settings_dict
        self.stdout.write(self.style.SUCCESS('Django is connected to the following database:'))
        self.stdout.write(f"  - Engine: {settings_dict.get('ENGINE')}")
        self.stdout.write(f"  - Name:   {settings_dict.get('NAME')}")
        self.stdout.write(f"  - User:   {settings_dict.get('USER')}")
        self.stdout.write(f"  - Host:   {settings_dict.get('HOST')}")
        self.stdout.write(f"  - Port:   {settings_dict.get('PORT')}")
