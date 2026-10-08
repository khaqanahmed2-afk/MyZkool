import glob
import subprocess
import sys

test_files = sorted(glob.glob('tests/*.ts'))
print(f"Found {len(test_files)} test files.\n", flush=True)

passed_files = 0
failed_files = 0

for f in test_files:
    res = subprocess.run(['npx', 'tsx', f], capture_output=True, text=True, shell=True)
    lines = [l.strip() for l in res.stdout.strip().split('\n') if l.strip()]
    summary = lines[-1] if lines else "NO OUTPUT"
    if res.returncode == 0:
        passed_files += 1
        print(f"[PASS] {f}: {summary}", flush=True)
    else:
        failed_files += 1
        print(f"[FAIL] {f}: exit code {res.returncode}", flush=True)
        if lines:
            print(f"       Last output: {lines[-1]}", flush=True)
        if res.stderr:
            print(f"       STDERR: {res.stderr[:200]}", flush=True)

print(f"\nSummary: {passed_files} passed, {failed_files} failed out of {len(test_files)} files.", flush=True)

if failed_files > 0:
    sys.exit(1)
else:
    sys.exit(0)
