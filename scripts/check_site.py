#!/usr/bin/env python3
"""Validate generated HTML, internal links, assets, CSS URLs and integrity hashes."""

import argparse
import base64
from collections import Counter
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import sys
import tomllib
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.links = []
        self.base = None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag == "base":
            self.base = attrs.get("href")
            return
        for name in ("href", "src", "poster", "data-src"):
            if attrs.get(name):
                self.links.append((attrs[name], attrs.get("integrity")))
        if attrs.get("srcset"):
            self.links.extend((entry.strip().split()[0], None)
                              for entry in attrs["srcset"].split(",") if entry.strip())

    handle_startendtag = handle_starttag


def check(public, base):
    base = base.rstrip("/") + "/"
    origin = urlsplit(base)
    prefix = origin.path
    pages = {p.relative_to(public).as_posix(): Page(p.read_text(encoding="utf-8"))
             for p in public.rglob("*.html")}
    errors = []

    def target(value, current):
        parsed = urlsplit(urljoin(current, value))
        if parsed.scheme not in ("http", "https") or parsed.netloc != origin.netloc:
            return None, None
        path = unquote(parsed.path)
        if not path.startswith(prefix):
            errors.append(f"{current}: 프로젝트 경로 밖의 URL: {value}")
            return None, None
        relative = path[len(prefix):]
        file = (public / relative).resolve()
        if not file.is_relative_to(public.resolve()):
            errors.append(f"{current}: 출력 폴더 밖의 URL: {value}")
            return None, None
        if file.is_dir():
            file /= "index.html"
        if not file.is_file():
            errors.append(f"{current}: 파일 없음: {value}")
            return None, None
        return file, unquote(parsed.fragment)

    expected = ["index.html", "about/index.html", "contact/index.html", "portfolio/index.html", "404.html"]
    projects = json.loads((ROOT / "site/data/bp_projects.json").read_text(encoding="utf-8"))
    expected.extend(project["page"].strip("/") + "/index.html"
                    for project in projects["projects"] if project.get("page"))
    for name in expected:
        if name not in pages:
            errors.append(f"필수 페이지 없음: {name}")

    references = 0
    for name, page in pages.items():
        duplicates = [value for value, count in Counter(page.ids).items() if count > 1]
        if duplicates:
            errors.append(f"{name}: 중복 ID: {', '.join(duplicates)}")
        document = urljoin(base, name)
        for value, integrity in page.links:
            file, fragment = target(value, page.base or document)
            references += 1
            if file is None:
                continue
            other = pages.get(file.relative_to(public).as_posix())
            if fragment and other and fragment not in other.ids:
                errors.append(f"{name}: 앵커 없음: {value}")
            if integrity:
                for token in integrity.split():
                    algorithm, digest = token.split("-", 1)
                    if algorithm not in ("sha256", "sha384", "sha512"):
                        errors.append(f"{name}: 지원하지 않는 무결성 해시: {algorithm}")
                        continue
                    actual = base64.b64encode(hashlib.new(algorithm, file.read_bytes()).digest()).decode()
                    if digest != actual:
                        errors.append(f"{name}: 무결성 해시 불일치: {value}")

    for file in public.rglob("*.css"):
        current = urljoin(base, file.relative_to(public).as_posix())
        for match in re.finditer(r"url\(\s*(['\"]?)(.*?)\1\s*\)", file.read_text(encoding="utf-8")):
            value = match[2]
            if value.startswith(("#", "data:")):
                continue
            target(value, current)
            references += 1

    if errors:
        print("\n".join(sorted(set(errors))), file=sys.stderr)
        return 1
    print(f"검증 통과: HTML {len(pages)}개, 링크·리소스 참조 {references}개, 중복 ID·누락 파일·해시 오류 없음")
    return 0


if __name__ == "__main__":
    config = tomllib.loads((ROOT / "site/hugo.toml").read_text(encoding="utf-8"))
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--public", type=Path, default=ROOT / "public")
    parser.add_argument("--base-url", default=os.environ.get("SITE_BASE_URL") or config["baseURL"])
    args = parser.parse_args()
    sys.exit(check(args.public.resolve(), args.base_url))
