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
    SolicitudVacacion, VacacionGuardada
)
from .serializers import (
    EmpleadoSerializer, DepartamentoSerializer, CargoSerializer,
    FamiliarSerializer, EstudioSerializer, ContratoSerializer, UserSerializer, UserCreateSerializer,
    JefeSerializer, PermisoSerializer, HoraExtraSerializer,
    SolicitudVacacionSerializer, VacacionGuardadaSerializer
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
            if role_name:
                try:
                    new_group = Group.objects.get(name=role_name)
                    instance.groups.clear()
                    instance.groups.add(new_group)
                except Group.DoesNotExist:
                    return Response({"error": f"El grupo '{role_name}' no existe."}, status=status.HTTP_400_BAD_REQUEST)
            
            if 'empleado_id' in request.data:
                empleado_id = request.data.get('empleado_id')
                if hasattr(instance, 'empleado') and instance.empleado:
                    old_empleado = instance.empleado
                    old_empleado.user = None
                    old_empleado.save()
                
                if empleado_id: 
                    try:
                        empleado = Empleado.objects.get(id=empleado_id)
                        empleado.user = instance
                        empleado.save()
                    except Empleado.DoesNotExist:
                        return Response({"error": "El empleado seleccionado no existe."}, status=status.HTTP_400_BAD_REQUEST)
                    except Exception as e:
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
        return qs

    def _prepare_data_from_request(self, request):
        data = {k: v for k, v in request.POST.items()}
        def clean_empty_strings(obj):
            if isinstance(obj, list): return [clean_empty_strings(i) for i in obj]
            if isinstance(obj, dict): return {k: (None if v == "" else clean_empty_strings(v)) for k, v in obj.items()}
            return obj
        def parse_json(key):
            val = request.POST.get(key)
            if val and isinstance(val, str):
                try: return clean_empty_strings(json.loads(val))
                except json.JSONDecodeError: return []
            return None
        for field in ['familiares', 'estudios', 'contratos']:
            parsed = parse_json(f'{field}_json')
            if parsed is not None: data[field] = parsed
        for key in ['familiares_json', 'estudios_json', 'contratos_json', 'cargo_nombre', 'departamento_nombre', 'jefe_info']:
            if key in data: data.pop(key)
        for key, file in request.FILES.items(): data[key] = file
        return data

    def create(self, request, *args, **kwargs):
        data = self._prepare_data_from_request(request)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

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
        if user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH', 'Porteria']).exists():
            qs = Permiso.objects.all().order_by('-fecha_solicitud')
            empleado_id = self.request.query_params.get('empleado')
            if empleado_id: qs = qs.filter(empleado_id=empleado_id)
            return qs
        if not hasattr(user, 'empleado'): return Permiso.objects.none()
        empleado = user.empleado
        q_filter = models.Q(empleado=empleado) | models.Q(aprobador_asignado=empleado)
        deptos_liderados = empleado.departamentos_liderados.all()
        if deptos_liderados.exists(): q_filter |= models.Q(empleado__departamento__in=deptos_liderados)
        return Permiso.objects.filter(q_filter).distinct().order_by('-fecha_solicitud')

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH', 'Encargado', 'Jefe de Departamento']).exists():
            empleado_id = self.request.data.get('empleado')
            if not empleado_id: raise serializers.ValidationError({"empleado": "Debes seleccionar un empleado."})
            empleado = Empleado.objects.get(pk=empleado_id)
        else:
            if not hasattr(user, 'empleado'): raise PermissionDenied("No tienes un perfil de empleado.")
            empleado = user.empleado
        aprobador = empleado.jefe
        serializer.save(empleado=empleado, aprobador_asignado=aprobador)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        solicitud = self.get_object()
        solicitud.estado = 'aprobado'
        solicitud.fecha_aprobacion = timezone.now()
        solicitud.comentario_aprobador = request.data.get('comentario', 'Aprobado')
        solicitud.save()
        return Response(self.get_serializer(solicitud).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        solicitud = self.get_object()
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
        if user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH']).exists():
            return HoraExtra.objects.all().order_by('-fecha_solicitud')
        if not hasattr(user, 'empleado'): return HoraExtra.objects.none()
        empleado = user.empleado
        q_filter = models.Q(empleado=empleado) | models.Q(aprobador_asignado=empleado)
        return HoraExtra.objects.filter(q_filter).distinct().order_by('-fecha_solicitud')

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH', 'Encargado', 'Jefe de Departamento']).exists():
            empleado_id = self.request.data.get('empleado')
            if not empleado_id: raise serializers.ValidationError({"empleado": "Debes seleccionar un empleado."})
            empleado = Empleado.objects.get(pk=empleado_id)
        else:
            if not hasattr(user, 'empleado'): raise PermissionDenied("No tienes un perfil de empleado.")
            empleado = user.empleado
        aprobador = empleado.jefe
        serializer.save(empleado=empleado, aprobador_asignado=aprobador)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        solicitud = self.get_object()
        solicitud.estado = 'aprobado'
        solicitud.fecha_aprobacion = timezone.now()
        solicitud.comentario_aprobador = request.data.get('comentario', 'Aprobado')
        solicitud.save()
        return Response(self.get_serializer(solicitud).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        solicitud = self.get_object()
        solicitud.estado = 'rechazado'
        solicitud.fecha_aprobacion = timezone.now()
        solicitud.comentario_aprobador = request.data.get('comentario', 'Rechazado')
        solicitud.save()
        return Response(self.get_serializer(solicitud).data)

# --- Vacaciones ViewSets ---

class VacacionGuardadaViewSet(viewsets.ModelViewSet):
    queryset = VacacionGuardada.objects.all().order_by('-fecha_creacion')
    serializer_class = VacacionGuardadaSerializer
    permission_classes = [IsStaffUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['empleado__nombres', 'empleado__apellido_paterno']

    def get_queryset(self):
        qs = super().get_queryset()
        empleado_id = self.request.query_params.get('empleado_id')
        if empleado_id: qs = qs.filter(empleado_id=empleado_id)
        return qs

class SolicitudVacacionViewSet(viewsets.ModelViewSet):
    queryset = SolicitudVacacion.objects.all()
    serializer_class = SolicitudVacacionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = OptionalPagination

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH']).exists():
            qs = SolicitudVacacion.objects.all().order_by('-fecha_solicitud')
            empleado_id = self.request.query_params.get('empleado')
            if empleado_id: qs = qs.filter(empleado_id=empleado_id)
            return qs
        if not hasattr(user, 'empleado'): return SolicitudVacacion.objects.none()
        empleado = user.empleado
        q_filter = models.Q(empleado=empleado) | models.Q(aprobador=empleado)
        deptos_liderados = empleado.departamentos_liderados.all()
        if deptos_liderados.exists(): q_filter |= models.Q(empleado__departamento__in=deptos_liderados)
        return SolicitudVacacion.objects.filter(q_filter).distinct().order_by('-fecha_solicitud')

    @action(detail=False, methods=['get'])
    def saldo(self, request):
        empleado_id = request.query_params.get('empleado_id')
        user = request.user
        if empleado_id:
            if not (user.is_superuser or user.groups.filter(name__in=['Admin', 'RRHH', 'Jefe de Departamento']).exists()):
                 return Response({'error': 'No tienes permiso.'}, status=403)
            try: empleado = Empleado.objects.get(pk=empleado_id)
            except Empleado.DoesNotExist: return Response({'error': 'No existe.'}, status=404)
        else:
            if not hasattr(user, 'empleado'): return Response({'saldo': 0.0})
            empleado = user.empleado

        # --- FILTERS BY VIGENTE ---
        filters_g = {'empleado': empleado}
        filters_s = {'empleado': empleado, 'estado': 'aprobado'}
        start_date = empleado.fecha_ingreso_vigente
        if start_date:
             filters_g['fecha__gte'] = start_date
             filters_s['fecha_inicio__gte'] = start_date

        ganados_objs = VacacionGuardada.objects.filter(**filters_g).order_by('fecha', 'id')
        consumidos_objs = SolicitudVacacion.objects.filter(**filters_s).order_by('fecha_inicio', 'id')
        
        # Antiquity and Law (Cumulative)
        anios, meses, dias = 0, 0, 0
        total_ley_acumulado = 0
        entries = []
        
        if start_date:
            from datetime import date, timedelta
            today = date.today()
            from dateutil.relativedelta import relativedelta
            try:
                rd = relativedelta(today, start_date)
                anios, meses, dias = rd.years, rd.months, rd.days
            except:
                anios = today.year - start_date.year
                if (today.month, today.day) < (start_date.month, start_date.day): anios -= 1

            # 1. Virtual entries for anniversaries (Law)
            for i in range(1, anios + 1):
                f_anniv = start_date + relativedelta(years=i)
                if i >= 11: d_ley = 30
                elif i >= 6: d_ley = 20
                else: d_ley = 15
                total_ley_acumulado += d_ley
                entries.append({
                    'fecha': f_anniv,
                    'tipo': 'Leyes Sociales',
                    'incidencia': f'Aniversario {i} años',
                    'dias': float(d_ley),
                    'contrato': f"Ciclo {start_date}"
                })

        # 2. Real entries (Guardadas)
        for g in ganados_objs:
            entries.append({
                'fecha': g.fecha or g.fecha_creacion,
                'tipo': 'Guardadas/Abono',
                'incidencia': g.gestion or 'Carga Manual',
                'dias': float(g.dias),
                'contrato': f"ID-{g.contrato.id if g.contrato else 'S/C'}"
            })

        # 3. Consumo entries
        for s in consumidos_objs:
            entries.append({
                'fecha': s.fecha_inicio,
                'tipo': 'Consumo',
                'incidencia': s.observacion or 'Vacaciones tomadas',
                'dias': -float(s.dias_calculados),
                'contrato': f"ID-{s.contrato.id if s.contrato else 'S/C'}"
            })

        # --- SORT AND COMPUTE RUNNING BALANCE ---
        # Sort by date, then by type (give positive entries priority on same day if needed, but simple date sort first)
        entries.sort(key=lambda x: x['fecha'])
        
        running = 0.0
        historial = []
        
        # Track totals for breakdown
        total_ganados_guardadas = 0.0
        total_ley_acumulado_final = 0.0
        total_consumido_historial = 0.0

        for e in entries:
            saldo_anterior = running
            running += e['dias']
            e['saldo_anterior'] = round(saldo_anterior, 1)
            e['saldo_actual'] = round(running, 1)
            historial.append(e)

            if e['dias'] > 0:
                if e['tipo'] == 'Leyes Sociales':
                    total_ley_acumulado_final += e['dias']
                else:
                    total_ganados_guardadas += e['dias']
            else:
                total_consumido_historial += abs(e['dias'])

        # Tiered consumption for breakdown display (Guardadas first, then Ley)
        # This logic matches the original requirement: consume from Guardadas first
        consumo_desde_guardadas = min(total_consumido_historial, total_ganados_guardadas)
        saldo_guardadas = total_ganados_guardadas - consumo_desde_guardadas
        
        consumo_restante = total_consumido_historial - consumo_desde_guardadas
        saldo_ley = total_ley_acumulado_final - consumo_restante

        return Response({
            'saldo': round(running, 1),
            'saldo_guardadas': round(saldo_guardadas, 1),
            'saldo_ley': round(saldo_ley, 1),
            'dias_ganados': round(total_ganados_guardadas, 1), # Only manual/saved entries
            'historial': historial,
            'antiguedad_detalle': f"{anios} años, {meses} meses, {dias} días",
            'fecha_ingreso_vigente': start_date,
            'vacacion_por_ley': total_ley_acumulado # Total accrued law days
        })

    @action(detail=False, methods=['post'])
    def liquidar(self, request):
        if not (request.user.is_superuser or request.user.groups.filter(name__in=['Admin', 'RRHH']).exists()):
            return Response({'error': 'No tienes permiso.'}, status=403)
            
        data = request.data
        empleado_id = data.get('empleado_id')
        nueva_fecha = data.get('nueva_fecha')
        dias_pagar = float(data.get('dias_pagar', 0))
        dias_guardar = float(data.get('dias_guardar', 0))

        try:
            empleado = Empleado.objects.get(pk=empleado_id)
        except Empleado.DoesNotExist:
            return Response({'error': 'Empleado no existe.'}, status=404)

        from datetime import datetime, timedelta
        nueva_dt = datetime.strptime(nueva_fecha, '%Y-%m-%d').date()
        fecha_cierre = nueva_dt - timedelta(days=1)

        with transaction.atomic():
            # 1. Cierre (negativos)
            if dias_pagar > 0:
                VacacionGuardada.objects.create(
                    empleado=empleado, dias=-dias_pagar, 
                    fecha=fecha_cierre, gestion="Vacaciones Pagadas (Cierre)"
                )
            if dias_guardar > 0:
                VacacionGuardada.objects.create(
                    empleado=empleado, dias=-dias_guardar, 
                    fecha=fecha_cierre, gestion="Traspaso (Salida)"
                )
                # 2. Apertura
                VacacionGuardada.objects.create(
                    empleado=empleado, dias=dias_guardar, 
                    fecha=nueva_dt, gestion="Saldo Inicial (Traspaso)"
                )
            
            # 3. Reset
            empleado.fecha_ingreso_vigente = nueva_dt
            empleado.save()

        return Response({'status': 'ok'})

    def perform_create(self, serializer):
        data = self.request.data
        empleado = Empleado.objects.get(pk=data.get('empleado'))
        from datetime import datetime, timedelta
        start = datetime.strptime(data.get('fecha_inicio'), '%Y-%m-%d').date()
        end = datetime.strptime(data.get('fecha_fin'), '%Y-%m-%d').date()
        es_medio_dia = data.get('es_medio_dia', False)
        dias = 0.5 if es_medio_dia else 0.0
        if not es_medio_dia:
            delta = end - start
            for i in range(delta.days + 1):
                if (start + timedelta(days=i)).weekday() <= 5: dias += 1.0
        serializer.save(
            empleado=empleado, aprobador=empleado.jefe,
            contrato=empleado.contratos.filter(estado_contrato='vigente').last(),
            dias_calculados=dias, estado='aprobado', fecha_aprobacion=timezone.now()
        )

    @action(detail=True, methods=['post'])
    def anular(self, request, pk=None):
        sol = self.get_object()
        sol.estado = 'anulado'
        sol.save()
        return Response(self.get_serializer(sol).data)
