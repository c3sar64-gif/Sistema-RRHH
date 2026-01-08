import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Empleado, Departamento, Cargo
from datetime import datetime

class Command(BaseCommand):
    help = 'Imports employees from an Excel file'

    def handle(self, *args, **options):
        excel_path = '../../Empleados.xlsx'
        self.stdout.write(self.style.SUCCESS(f'Importing employees from {excel_path}'))

        try:
            # Read the Excel file without assuming any header
            df = pd.read_excel(excel_path, header=None)
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR('Empleados.xlsx not found in the root directory.'))
            return
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error reading Excel file: {e}'))
            return

        with transaction.atomic():
            for index, row in df.iterrows():
                try:
                    # Access data by position (index)
                    nombres = row.iloc[0]
                    apellido_paterno = row.iloc[1]
                    apellido_materno = row.iloc[2]
                    ci = row.iloc[3]
                    fecha_nacimiento = row.iloc[4]
                    fecha_ingreso = row.iloc[5]
                    departamento_nombre = row.iloc[6]
                    cargo_nombre = row.iloc[7]

                    # Skip rows where CI is missing
                    if pd.isna(ci):
                        self.stdout.write(self.style.WARNING(f"Skipping row {index+1} due to missing CI."))
                        continue

                    # Get foreign key objects
                    departamento, _ = Departamento.objects.get_or_create(nombre=str(departamento_nombre).strip())
                    cargo, _ = Cargo.objects.get_or_create(nombre=str(cargo_nombre).strip())

                    # Prepare employee data
                    employee_data = {
                        'nombres': str(nombres).strip(),
                        'apellido_paterno': str(apellido_paterno).strip(),
                        'apellido_materno': str(apellido_materno).strip() if pd.notna(apellido_materno) else '',
                        'fecha_nacimiento': fecha_nacimiento.date() if pd.notna(fecha_nacimiento) else None,
                        'fecha_ingreso_inicial': fecha_ingreso.date() if pd.notna(fecha_ingreso) else datetime.now().date(),
                        'departamento': departamento,
                        'cargo': cargo,
                        # Add default values for other required fields
                        'sexo': 'M', 
                        'estado_civil': 'S',
                        'celular': '00000000',
                        'email': f"{str(nombres).strip().replace(' ', '.').lower()}.{str(apellido_paterno).strip().lower()}@example.com",
                        'provincia': 'Default',
                        'direccion': 'Default',
                        'tipo_vivienda': 'P',
                        'nacionalidad': 'Boliviana',
                    }

                    # Use get_or_create to avoid duplicates
                    obj, created = Empleado.objects.get_or_create(
                        ci=str(int(ci)),
                        defaults=employee_data
                    )

                    if created:
                        self.stdout.write(self.style.SUCCESS(f"Successfully created employee: {obj.nombres} {obj.apellido_paterno}"))
                    else:
                        self.stdout.write(self.style.WARNING(f"Employee already exists: {obj.nombres} {obj.apellido_paterno}"))

                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error processing row {index+1}: {e} - Data: {row.to_dict()}"))

        self.stdout.write(self.style.SUCCESS('Finished importing employees.'))