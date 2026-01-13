from rest_framework import viewsets, generics, status, filters
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth.models import User, Group
from django.db import transaction, models
from django.utils import timezone
import json

from .models import (
    Empleado, Departamento, Cargo, Familiar, Estudio, Contrato, Permiso, HoraExtra,
    VacacionPeriodo, SolicitudVacacion, VacacionMovimiento, VacacionGuardada
)
from .serializers import (
    EmpleadoSerializer, DepartamentoSerializer, CargoSerializer,
    FamiliarSerializer, EstudioSerializer, ContratoSerializer, UserSerializer, UserCreateSerializer,
    JefeSerializer, PermisoSerializer, HoraExtraSerializer,
    VacacionPeriodoSerializer, SolicitudVacacionSerializer, VacacionMovimientoSerializer, VacacionGuardadaSerializer
)
from .permissions import IsAdminUser, IsStaffUser
from .pagination import OptionalPagination

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        role_name = request.data.get('role')
        with transaction.atomic():
            # Update Role
            if role_name:
                try:
                    new_group = Group.objects.get(name=role_name)
                    instance.groups.clear()
                    instance.groups.add(new_group)
                except Group.DoesNotExist:
                    return Response({"error": f"El grupo '{role_name}' no existe."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Update Employee Link
            if 'empleado_id' in request.data:
                empleado_id = request.data.get('empleado_id')
                
                # Desvincular empleado actual si existe
                if hasattr(instance, 'empleado') and instance.empleado:
                    old_empleado = instance.empleado
                    old_empleado.user = None
                    old_empleado.save()
                
                # Vincular nuevo empleado si se proporciona un ID válido
                if empleado_id: 
                    try:
                        empleado = Empleado.objects.get(id=empleado_id)
                        empleado.user = instance
                        empleado.save()
                    except Empleado.DoesNotExist:
                        return Response({"error": "El empleado seleccionado no existe."}, status=status.HTTP_400_BAD_REQUEST)
                    except Exception as e:
                         # Catch potential IntegrityError if employee already has a user? O2O is unique?
                         # Empleado.user is OneToOneField. So one employee can have only one user.
                         # If we try to assign this user to an employee who already has a DIFFERENT user, what happens?
                         # But we are assigning a user TO an employee.
                         return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

class UserCreate(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [IsAdminUser]

class JefesDepartamentoListView(generics.ListAPIView):
    queryset = Empleado.objects.filter(departamentos_liderados__isnull=False).distinct().order_by('nombres', 'apellido_paterno', 'apellido_materno')
    serializer_class = JefeSerializer
    permission_classes = [IsStaffUser]
    pagination_class = None

class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = Empleado.objects.all().order_by('nombres', 'apellido_paterno', 'apellido_materno')
    serializer_class = EmpleadoSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsStaffUser]
    pagination_class = OptionalPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombres', 'apellido_paterno', 'apellido_materno', 'ci']

    def get_queryset(self):
        qs = super().get_queryset()
        # Filter for "Vacaciones Guardadas"
        has_guardadas = self.request.query_params.get('has_vacaciones_guardadas')
        if has_guardadas == 'true':
            qs = qs.filter(vacaciones_guardadas__gt=0)
        
        # Existing pagination flag handling is done in OptionalPagination but we might need to be careful
        # returning qs is standard.
        return qs

    def _prepare_data_from_request(self, request):
        data = request.POST.copy()
        if 'familiares_json' in data:
            data['familiares'] = json.loads(data.pop('familiares_json')[0])
        if 'contratos_json' in data:
            data['contratos'] = json.loads(data.pop('contratos_json')[0])
        if 'estudios_json' in data:
            data['estudios'] = json.loads(data.pop('estudios_json')[0])
        for key, file in request.FILES.items():
            data[key] = file
        return data

    def create(self, request, *args, **kwargs):
        data = self._prepare_data_from_request(request)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = self._prepare_data_from_request(request)
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

class DepartamentoViewSet(viewsets.ModelViewSet):
    queryset = Departamento.objects.all().order_by('nombre')
    serializer_class = DepartamentoSerializer
    permission_classes = [IsStaffUser]
    pagination_class = OptionalPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']

class CargoViewSet(viewsets.ModelViewSet):
    queryset = Cargo.objects.all().order_by('nombre')
    serializer_class = CargoSerializer
    permission_classes = [IsStaffUser]
    pagination_class = OptionalPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']

class FamiliarViewSet(viewsets.ModelViewSet):
    queryset = Familiar.objects.all()
    serializer_class = FamiliarSerializer
    permission_classes = [IsAdminUser]

class EstudioViewSet(viewsets.ModelViewSet):
    queryset = Estudio.objects.all()
    serializer_class = EstudioSerializer
    permission_classes = [IsAdminUser]

class ContratoViewSet(viewsets.ModelViewSet):
    queryset = Contrato.objects.all()
    serializer_class = ContratoSerializer
    permission_classes = [IsAdminUser]

class PermisoViewSet(viewsets.ModelViewSet):
    queryset = Permiso.objects.all()
    serializer_class = PermisoSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = OptionalPagination

    def get_queryset(self):
        user = self.request.user
        
        # Admin, RRHH and Porteria groups can see all requests
        if user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH', 'Porteria']).exists():
            return Permiso.objects.all().order_by('-fecha_solicitud')

        if not hasattr(user, 'empleado'):
            return Permiso.objects.none()

        empleado = user.empleado
        
        # Base condition: Users see their own requests and requests they assume as approver
        q_filter = models.Q(empleado=empleado) | models.Q(aprobador_asignado=empleado)

        # Encargado/Jefe logic: Can see requests from departments they lead
        deptos_liderados = empleado.departamentos_liderados.all()
        if deptos_liderados.exists():
             q_filter |= models.Q(empleado__departamento__in=deptos_liderados)

        return Permiso.objects.filter(q_filter).distinct().order_by('-fecha_solicitud')

    def perform_create(self, serializer):
        user = self.request.user
        
        # Admin/HR can create for other employees specified in the request
        if user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH', 'Encargado', 'Jefe de Departamento']).exists():
            empleado_id = self.request.data.get('empleado')
            if not empleado_id:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"empleado": "Debes seleccionar un empleado."})
            try:
                empleado = Empleado.objects.get(pk=empleado_id)
            except Empleado.DoesNotExist:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"empleado": "El empleado seleccionado no existe."})
        else: # Regular employee requests for themselves
            if not hasattr(user, 'empleado'):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("No tienes un perfil de empleado para crear solicitudes.")
            empleado = user.empleado

        aprobador = empleado.jefe
        if not aprobador:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(f"El empleado '{empleado}' no tiene un jefe inmediato asignado para aprobar el permiso.")
            
        serializer.save(empleado=empleado, aprobador_asignado=aprobador)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        solicitud = self.get_object()
        user_empleado = request.user.empleado
        if solicitud.aprobador_asignado != user_empleado:
            return Response({'error': 'No tienes permiso para aprobar esta solicitud.'}, status=status.HTTP_403_FORBIDDEN)
        if solicitud.estado != 'pendiente':
            return Response({'error': 'Solo se pueden aprobar solicitudes pendientes.'}, status=status.HTTP_400_BAD_REQUEST)
        solicitud.estado = 'aprobado'
        solicitud.fecha_aprobacion = timezone.now()
        solicitud.comentario_aprobador = request.data.get('comentario', 'Aprobado')
        solicitud.save()
        return Response(self.get_serializer(solicitud).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        solicitud = self.get_object()
        user_empleado = request.user.empleado
        if solicitud.aprobador_asignado != user_empleado:
            return Response({'error': 'No tienes permiso para rechazar esta solicitud.'}, status=status.HTTP_403_FORBIDDEN)
        if solicitud.estado != 'pendiente':
            return Response({'error': 'Solo se pueden rechazar solicitudes pendientes.'}, status=status.HTTP_400_BAD_REQUEST)
        solicitud.estado = 'rechazado'
        solicitud.fecha_aprobacion = timezone.now()
        solicitud.comentario_aprobador = request.data.get('comentario', 'Rechazado')
        solicitud.save()
        return Response(self.get_serializer(solicitud).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

class HoraExtraViewSet(viewsets.ModelViewSet):
    queryset = HoraExtra.objects.all()
    serializer_class = HoraExtraSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = OptionalPagination

    def get_queryset(self):
        user = self.request.user
        
        # Admin, RRHH can see all requests
        if user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH']).exists():
            return HoraExtra.objects.all().order_by('-fecha_solicitud')

        if not hasattr(user, 'empleado'):
            return HoraExtra.objects.none()

        empleado = user.empleado
        
        # Check if user is one of the specific authorized Jefes
        materno = f" {empleado.apellido_materno}" if empleado.apellido_materno else ""
        nombre_completo = f"{empleado.nombres} {empleado.apellido_paterno}{materno}".strip()
        
        authorized_names = ['Alcira Fuentes Marcusi', 'Esteban Martinez Manuel']
        
        if nombre_completo in authorized_names:
             # Authorized Jefes can see requests from departments they lead
            deptos_liderados = empleado.departamentos_liderados.all()
            if deptos_liderados.exists():
                 q_filter = models.Q(empleado=empleado) | models.Q(aprobador_asignado=empleado) | models.Q(empleado__departamento__in=deptos_liderados)
                 return HoraExtra.objects.filter(q_filter).distinct().order_by('-fecha_solicitud')
        
        # Regular employees (or non-authorized Jefes) ONLY see their own requests
        # NOTE: User specified "Visible for...", implying strict access control.
        # But if a regular employee logs in, they might expect to see THEIR OWN requests?
        # The prompt says "Horas Extras solo tiene que ser visible para...".
        # This likely means the MODULE itself. 
        # For the API, it's safer to allow employees to see their own records if they somehow navigate there, 
        # or if the "Registrar" button is available elsewhere.
        # However, to be strict with "Visibility", I'll default to only own records for everyone else,
        # but effectively the Frontend hides the entry point.
        
        q_filter = models.Q(empleado=empleado) | models.Q(aprobador_asignado=empleado)
        return HoraExtra.objects.filter(q_filter).distinct().order_by('-fecha_solicitud')

    def perform_create(self, serializer):
        user = self.request.user
        
        # Admin/HR can create for other employees specified in the request
        if user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH', 'Encargado', 'Jefe de Departamento']).exists():
            empleado_id = self.request.data.get('empleado')
            if not empleado_id:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"empleado": "Debes seleccionar un empleado."})
            try:
                empleado = Empleado.objects.get(pk=empleado_id)
            except Empleado.DoesNotExist:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"empleado": "El empleado seleccionado no existe."})
        else: # Regular employee requests for themselves
            if not hasattr(user, 'empleado'):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("No tienes un perfil de empleado para crear solicitudes.")
            empleado = user.empleado

        aprobador = empleado.jefe
        # For now, require approver same as Permiso
        if not aprobador:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(f"El empleado '{empleado}' no tiene un jefe inmediato asignado para aprobar la solicitud.")
            
        serializer.save(empleado=empleado, aprobador_asignado=aprobador)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        solicitud = self.get_object()
        user_empleado = request.user.empleado
        if solicitud.aprobador_asignado != user_empleado:
            return Response({'error': 'No tienes permiso para aprobar esta solicitud.'}, status=status.HTTP_403_FORBIDDEN)
        if solicitud.estado != 'pendiente':
            return Response({'error': 'Solo se pueden aprobar solicitudes pendientes.'}, status=status.HTTP_400_BAD_REQUEST)
        solicitud.estado = 'aprobado'
        solicitud.fecha_aprobacion = timezone.now()
        solicitud.comentario_aprobador = request.data.get('comentario', 'Aprobado')
        solicitud.save()
        return Response(self.get_serializer(solicitud).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        solicitud = self.get_object()
        user_empleado = request.user.empleado
        if solicitud.aprobador_asignado != user_empleado:
            return Response({'error': 'No tienes permiso para rechazar esta solicitud.'}, status=status.HTTP_403_FORBIDDEN)
        if solicitud.estado != 'pendiente':
            return Response({'error': 'Solo se pueden rechazar solicitudes pendientes.'}, status=status.HTTP_400_BAD_REQUEST)
        solicitud.estado = 'rechazado'
        solicitud.fecha_aprobacion = timezone.now()
        solicitud.comentario_aprobador = request.data.get('comentario', 'Rechazado')
        solicitud.save()
        return Response(self.get_serializer(solicitud).data)

# --- Vacaciones ViewSets ---

class VacacionPeriodoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VacacionPeriodo.objects.all()
    serializer_class = VacacionPeriodoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'empleado'):
             if user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH']).exists():
                 return VacacionPeriodo.objects.all()
             return VacacionPeriodo.objects.none()
        
        # Admins see all, employees see theirs
        if user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH']).exists():
            return VacacionPeriodo.objects.all().order_by('-fecha_inicio')
        
        # Admins see all, employees see theirs
        if user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH']).exists():
            return VacacionPeriodo.objects.all().order_by('-fecha_inicio')
        
        return VacacionPeriodo.objects.filter(empleado=user.empleado).order_by('-fecha_inicio')

    @action(detail=False, methods=['get'])
    def saldo(self, request):
        empleado_id = request.query_params.get('empleado_id')
        user = request.user
        
        # Determine target employee
        if empleado_id:
            # Check permissions to view other's balance
            if not (user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH', 'Jefe de Departamento']).exists()):
                 return Response({'error': 'No tienes permiso para ver el saldo de otro empleado.'}, status=status.HTTP_403_FORBIDDEN)
            try:
                empleado = Empleado.objects.get(pk=empleado_id)
            except Empleado.DoesNotExist:
                 return Response({'error': 'Empleado no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            if not hasattr(user, 'empleado'):
                return Response({'saldo': 0.0})
            empleado = user.empleado

        # Use ONLY fecha_ingreso_vigente for calculation as requested
        effective_hire_date = empleado.fecha_ingreso_vigente
        
        # Calculate longevity (Antigüedad) detailed: Years, Months, Days
        antiguedad_detallada = ""
        if effective_hire_date:
            from datetime import date
            from dateutil.relativedelta import relativedelta
            
            hire_date = effective_hire_date
            today = date.today()
            diff = relativedelta(today, hire_date)
            
            parts = []
            if diff.years > 0:
                parts.append(f"{diff.years} {'año' if diff.years == 1 else 'años'}")
            if diff.months > 0:
                parts.append(f"{diff.months} {'mes' if diff.months == 1 else 'meses'}")
            if diff.days > 0:
                parts.append(f"{diff.days} {'día' if diff.days == 1 else 'días'}")
            
            antiguedad_detallada = ", ".join(parts) if parts else "0 días"
            
            # Excel formula logic: =(SI(H6<5;H6;5)*15)+(SI(H6>10;5;SI((H6-5)>0;H6-5;0)))*20+(SI(H6>10;H6-10;0)*30)
            years = diff.years
            part1 = min(years, 5) * 15
            
            if years > 10:
                part2 = 5 * 20
            elif (years - 5) > 0:
                part2 = (years - 5) * 20
            else:
                part2 = 0
                
            part3 = max(years - 10, 0) * 30
            vacacion_cumplida = part1 + part2 + part3
        else:
            vacacion_cumplida = 0

        # Find active period (still useful for period_id and period_inicio)
        periodo = VacacionPeriodo.objects.filter(empleado=empleado, activo=True).last()
        
        # Calculate saved days from new table
        guardadas_total = VacacionGuardada.objects.filter(empleado=empleado).aggregate(total=models.Sum('dias'))['total'] or 0.0
        
        # Calculate consumption (LTD Debits)
        # Sum all movements that are NOT the standard accumulation types ('inicio_contrato', 'acumulacion_anual')
        # This includes 'consumo' (negative), 'pago' (negative), 'ajuste' (any), 'traspaso' (any)
        consumo_total = VacacionMovimiento.objects.filter(
            empleado=empleado
        ).exclude(
            tipo__in=['inicio_contrato', 'acumulacion_anual']
        ).aggregate(total=models.Sum('dias'))['total'] or 0.0
        
        # Redefined Saldo Actual = (LTD Earned) + (LTD Guarded) + (LTD Movements/Consumptions)
        saldo_total = float(vacacion_cumplida) + float(guardadas_total) + float(consumo_total)

        if not periodo:
            return Response({
                'saldo': saldo_total,
                'saldo_periodo': float(consumo_total),
                'saldo_guardadas': float(guardadas_total),
                'periodo': None,
                'periodo_inicio': effective_hire_date,
                'fecha_ingreso_vigente': effective_hire_date,
                'anios_trabajados': antiguedad_detallada,
                'vacacion_cumplida': vacacion_cumplida
            })
            
        fecha_inicio_show = empleado.fecha_ingreso_vigente if empleado.fecha_ingreso_vigente else periodo.fecha_inicio

        return Response({
            'saldo': saldo_total,
            'saldo_periodo': float(consumo_total),
            'saldo_guardadas': float(guardadas_total),
            'periodo_id': periodo.id,
            'periodo_inicio': fecha_inicio_show,
            'fecha_ingreso_vigente': effective_hire_date,
            'anios_trabajados': antiguedad_detallada,
            'vacacion_cumplida': vacacion_cumplida
        })

class VacacionGuardadaViewSet(viewsets.ModelViewSet):
    queryset = VacacionGuardada.objects.all().order_by('-fecha_creacion')
    serializer_class = VacacionGuardadaSerializer
    permission_classes = [IsAdminUser] # Restricted to admin/RRHH
    filter_backends = [filters.SearchFilter]
    search_fields = ['empleado__nombres', 'empleado__apellido_paterno']

    def get_queryset(self):
        qs = super().get_queryset()
        empleado_id = self.request.query_params.get('empleado_id')
        if empleado_id:
            qs = qs.filter(empleado_id=empleado_id)
        return qs

class VacacionMovimientoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VacacionMovimiento.objects.all()
    serializer_class = VacacionMovimientoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = VacacionMovimiento.objects.all().order_by('-fecha')
        
        empleado_id = self.request.query_params.get('empleado')
        if empleado_id:
            qs = qs.filter(empleado_id=empleado_id)
        
        if not hasattr(user, 'empleado'):
             if user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH']).exists():
                 return qs
             return VacacionMovimiento.objects.none()
             
        if not (user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH']).exists()):
            qs = qs.filter(empleado=user.empleado)
            
        return qs

class SolicitudVacacionViewSet(viewsets.ModelViewSet):
    queryset = SolicitudVacacion.objects.all()
    serializer_class = SolicitudVacacionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = OptionalPagination

    def get_queryset(self):
        user = self.request.user
        
        if user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH']).exists():
            return SolicitudVacacion.objects.all().order_by('-fecha_solicitud')

        if not hasattr(user, 'empleado'):
            return SolicitudVacacion.objects.none()

        empleado = user.empleado
        
        # See own requests and requests to approve
        q_filter = models.Q(empleado=empleado) | models.Q(aprobador=empleado)
        
        # See department requests if Jefe
        deptos_liderados = empleado.departamentos_liderados.all()
        if deptos_liderados.exists():
             q_filter |= models.Q(empleado__departamento__in=deptos_liderados)
             
        return SolicitudVacacion.objects.filter(q_filter).distinct().order_by('-fecha_solicitud')

    def perform_create(self, serializer):
        user = self.request.user
        data = self.request.data

        # 1. Identify Empleado
        if user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH', 'Jefe de Departamento']).exists():
            empleado_id = data.get('empleado')
            if not empleado_id:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"empleado": "Debes seleccionar un empleado."})
            empleado = Empleado.objects.get(pk=empleado_id)
        else:
            if not hasattr(user, 'empleado'):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("No tienes un perfil de empleado.")
            empleado = user.empleado
            
        aprobador = empleado.jefe
        
        # 2. Logic to calculate days
        from datetime import datetime, timedelta
        import math
        
        fecha_inicio_str = data.get('fecha_inicio')
        fecha_fin_str = data.get('fecha_fin')
        es_medio_dia = data.get('es_medio_dia', False)

        if not fecha_inicio_str or not fecha_fin_str:
             from rest_framework.exceptions import ValidationError
             raise ValidationError("Fechas requeridas.")
        
        start = datetime.strptime(fecha_inicio_str, '%Y-%m-%d').date()
        end = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()
        
        if end < start:
             from rest_framework.exceptions import ValidationError
             raise ValidationError("Fecha fin no puede ser anterior a fecha inicio.")

        # Day Calculation
        dias_calculados = 0.0
        
        if es_medio_dia:
            # If "Medio Día" is checked, forced to 0.5 regardless of range (usually range should be 1 day)
            if start != end:
                 from rest_framework.exceptions import ValidationError
                 raise ValidationError("Para 'Media Jornada', la fecha inicio y fin deben ser la misma.")
            dias_calculados = 0.5
        else:
            # Iterate days
            delta = end - start
            for i in range(delta.days + 1):
                day = start + timedelta(days=i)
                # Monday(0) to Saturday(5) = 1 day (User Rule: Sat counts as 1 day for deduction)
                # Sunday(6) = 0
                if day.weekday() <= 5: # 0-5 includes Saturday
                    dias_calculados += 1.0
        
        # 3. Check Balance (Optional strictness, User said balance can go negative?
        # "El empleado empieza con 5 dias pero va sacando 3 dias y luego otro 3 dias y su saldo seria -1"
        # So we allow negative.
        
        # 4. Find Active Period
        periodo_activo = VacacionPeriodo.objects.filter(empleado=empleado, activo=True).last()
        if not periodo_activo:
            # Auto-create period if missing (Safety net)
            # Assuming start from employee entry date or today
            periodo_activo = VacacionPeriodo.objects.create(
                empleado=empleado,
                fecha_inicio=empleado.fecha_ingreso_inicial, # or contract start
                fecha_fin=None,
                activo=True
            )
            # Create initial movement if it's a fresh period? No, assume 0 balance until accrual logic runs.

        # 5. Save and Create Movement immediately
        with transaction.atomic():
            solicitud = serializer.save(
                empleado=empleado, 
                aprobador=aprobador,
                dias_calculados=dias_calculados,
                estado='aprobado',
                fecha_aprobacion=timezone.now()
            )
            
            VacacionMovimiento.objects.create(
                empleado=solicitud.empleado,
                periodo=periodo_activo,
                tipo='consumo',
                dias=-solicitud.dias_calculados,
                solicitud=solicitud,
                detalle=f"Vacación aprobada del {solicitud.fecha_inicio} al {solicitud.fecha_fin}"
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def anular(self, request, pk=None):
        solicitud = self.get_object()
        user_empleado = getattr(request.user, 'empleado', None)
        
        # Permission check: Admin, RRHH, or the employee themselves
        can_cancel = False
        if request.user.is_superuser or request.user.groups.filter(name__in=['Admin', 'RRHH']).exists():
             can_cancel = True
        elif solicitud.empleado == user_empleado:
             can_cancel = True
             
        if not can_cancel:
            return Response({'error': 'No tienes permiso para anular.'}, status=status.HTTP_403_FORBIDDEN)

        if solicitud.estado == 'anulado':
            return Response({'error': 'La solicitud ya está anulada.'}, status=status.HTTP_400_BAD_REQUEST)

        # Execute Transaction
        with transaction.atomic():
            solicitud.estado = 'anulado'
            solicitud.save()
            
            # Remove associated movements (consumption)
            solicitud.movimientos.all().delete()

        return Response(self.get_serializer(solicitud).data)
        

