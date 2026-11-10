"""Upload only ILLAM's three server secrets from .env.local via stdin."""
import pathlib, subprocess
values = {}
for line in pathlib.Path('.env.local').read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        k,v = line.split('=',1)
        values[k] = v.strip().strip('"').strip("'")
for key in ('DATABASE_URL','NEON_AUTH_BASE_URL','NEON_AUTH_COOKIE_SECRET'):
    if not values.get(key): raise SystemExit('Missing '+key)
    result = subprocess.run(['npx','--yes','vercel','env','add',key,'production','--sensitive'],input=values[key],text=True,capture_output=True)
    if result.returncode: raise SystemExit('Could not configure '+key+'. Check Vercel login and existing environment variables.')
    print('Configured '+key,flush=True)
