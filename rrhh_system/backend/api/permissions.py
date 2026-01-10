# api/permissions.py
from rest_framework.permissions import BasePermission

class IsAdminUser(BasePermission):
    """
    Allows access only to admin users or superusers or RRHH.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        return request.user.is_superuser or request.user.groups.filter(name__in=['Admin', 'RRHH']).exists()

class IsStaffUser(BasePermission):
    """
    Allows access to Admin, RRHH, Encargado, and Jefe de Departamento.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        return request.user.is_superuser or request.user.groups.filter(name__in=['Admin', 'RRHH', 'Encargado', 'Jefe de Departamento']).exists()
