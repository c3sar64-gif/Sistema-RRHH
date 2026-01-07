from django.core.management.base import BaseCommand
from django.db import connection, OperationalError
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Tests the database connection and attempts to read data.'

    def handle(self, *args, **options):
        try:
            with connection.cursor() as cursor:
                self.stdout.write(self.style.SUCCESS('Successfully connected to the database.'))
                settings_dict = connection.settings_dict
                self.stdout.write(f"  - Database: {settings_dict.get('NAME')}@{settings_dict.get('HOST')}")
                
                self.stdout.write(self.style.NOTICE('\nAttempting to read from the user table...'))
                user_count = User.objects.count()
                self.stdout.write(self.style.SUCCESS(f'  - Successfully read from the database. Found {user_count} users.'))

        except OperationalError as e:
            self.stdout.write(self.style.ERROR('DATABASE CONNECTION FAILED.'))
            self.stdout.write(self.style.ERROR(f'  - Error: {e}'))
            self.stdout.write(self.style.WARNING('  - Please check your database server is running and the credentials in settings.py are correct.'))
        
        except Exception as e:
            self.stdout.write(self.style.ERROR('An unexpected error occurred.'))
            self.stdout.write(self.style.ERROR(f'  - Error: {e}'))