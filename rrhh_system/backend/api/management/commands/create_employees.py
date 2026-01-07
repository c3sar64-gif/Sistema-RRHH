import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from faker import Faker

from api.models import Employee, Departamento

class Command(BaseCommand):
    help = 'Creates a specified number of fake employees for testing.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=20,
            help='Number of employees to create',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        count = options['count']
        fake = Faker()

        # Get all departments
        departments = list(Departamento.objects.all())
        if not departments:
            raise CommandError('No departments found. Please create some departments first.')

        # Predefined list of positions
        positions = [
            'Software Developer', 'Project Manager', 'System Analyst', 'Accountant',
            'HR Manager', 'QA Tester', 'DevOps Engineer', 'Warehouse Manager'
        ]

        self.stdout.write(f'Creating {count} new employees...')
        created_count = 0
        for _ in range(count):
            # Generate fake data
            name = fake.name()
            email = fake.unique.email()
            position = random.choice(positions)
            hire_date = date.today() - timedelta(days=random.randint(30, 365 * 5))
            department = random.choice(departments)

            # Create employee
            Employee.objects.create(
                name=name,
                email=email,
                position=position,
                hire_date=hire_date,
                departamento=department,
            )
            created_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully created {created_count} new employees.'))
