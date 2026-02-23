"""Walk FastAPI dependency tree for create_session to find *args/**kwargs."""
from app.main import app
import inspect

# Find the route
route = None
for r in app.routes:
    if hasattr(r, 'path') and 'sessions' in r.path and hasattr(r, 'methods') and 'POST' in r.methods:
        route = r
        break

if not route:
    print("Route not found!")
    exit(1)

def walk(dep, depth=0):
    call = dep.call
    sig = inspect.signature(call)
    params = list(sig.parameters.values())
    has_args = any(p.kind == inspect.Parameter.VAR_POSITIONAL for p in params)
    has_kwargs = any(p.kind == inspect.Parameter.VAR_KEYWORD for p in params)
    
    if has_args or has_kwargs:
        print(f"{'  ' * depth}⚠️  {call} has *args={has_args}, **kwargs={has_kwargs}")
        print(f"{'  ' * depth}   Signature: {sig}")
    else:
        print(f"{'  ' * depth}OK {getattr(call, '__name__', str(call))}")
    
    for sub_dep in dep.dependencies:
        walk(sub_dep, depth + 1)

print("Walking dependency tree for POST /api/v1/attendance/sessions:")
walk(route.dependant)
