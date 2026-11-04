#!/usr/bin/env python3
"""Build or serve the single, maintained Hugo site. Requires Python 3.11+."""

import argparse
import os
from pathlib import Path
import shutil
import subprocess
import tomllib

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"


def run(command, *, cwd=SITE, env=None):
    executable = shutil.which(command[0])
    if not executable:
        raise RuntimeError(f"빌드 도구를 찾을 수 없습니다: {command[0]}")
    subprocess.run([executable, *command[1:]], cwd=cwd, env=env, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--dependencies", action="store_true")
    action.add_argument("--build", action="store_true")
    action.add_argument("--serve", action="store_true")
    args = parser.parse_args()

    if args.dependencies:
        # One package and one lockfile; never modify dependencies during a build.
        run(["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"])
        return

    env = os.environ.copy()
    env.setdefault("GOMAXPROCS", "2")
    env["PATH"] = str(SITE / "node_modules/.bin") + os.pathsep + env.get("PATH", "")
    if args.serve:
        run(["hugo", "server", "--baseURL", "http://localhost:1314/",
             "--port", "1314", "--disableFastRender"], env=env)
        return

    config = tomllib.loads((SITE / "hugo.toml").read_text(encoding="utf-8"))
    base = (env.get("SITE_BASE_URL") or config["baseURL"]).rstrip("/") + "/"
    output = ROOT / "public"
    run(["hugo", "--gc", "--minify", "--environment", "production",
         "--cleanDestinationDir", "--destination", str(output), "--baseURL", base], env=env)
    if not (output / "index.html").is_file():
        raise RuntimeError("홈페이지 index.html이 생성되지 않았습니다.")
    (output / ".nojekyll").touch()
    print(f"빌드 완료: {output}")


if __name__ == "__main__":
    main()
