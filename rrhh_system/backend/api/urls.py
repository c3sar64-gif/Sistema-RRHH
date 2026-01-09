from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserCreate, EmpleadoViewSet, DepartamentoViewSet, CargoViewSet,
    FamiliarViewSet, EstudioViewSet, ContratoViewSet, get_current_user, UserViewSet,
    JefesDepartamentoListView, PermisoViewSet
)

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'empleados', EmpleadoViewSet)
router.register(r'departamentos', DepartamentoViewSet)
router.register(r'cargos', CargoViewSet)
router.register(r'familiares', FamiliarViewSet)
router.register(r'estudios', EstudioViewSet)
router.register(r'contratos', ContratoViewSet)
router.register(r'permisos', PermisoViewSet)

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('jefes-departamento/', JefesDepartamentoListView.as_view(), name='jefes-departamento-list'),
    path('register/', UserCreate.as_view(), name='user-create'),
    path('me/', get_current_user, name='current-user'),
    path('', include(router.urls)),
]
