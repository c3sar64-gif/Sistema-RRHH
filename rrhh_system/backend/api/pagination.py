from rest_framework.pagination import PageNumberPagination

class OptionalPagination(PageNumberPagination):
    """
    A custom pagination class that allows disabling pagination via a query parameter.
    """
    def paginate_queryset(self, queryset, request, view=None):
        if 'no_pagination' in request.query_params:
            return None
        return super().paginate_queryset(queryset, request, view)
