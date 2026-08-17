#!/usr/bin/env python3
"""Build the GALAXY capability network from the real NeoTrix codebase.

Scans neotrix-core/src for nt_* modules, maps each to a domain + layer
using the filename prefix and the impl-layer directory it lives in,
extracts pub fn names as capability tags (caps), and derives edges from
real `use crate::nt_*` dependencies between modules.

Output: RegistryExport-style JSON consumed by index.html:
  {"nodes":[{"id","domain","layer","caps"}],"edges":[["a","b"],...]}

Usage: python3 tools/build_galaxy.py /path/to/neotrix [-o galaxy.json]
"""

import json
import os
import re
import sys
from collections import defaultdict

SRC = "neotrix-core/src"

# prefix -> domain (filename primary signal)
PREFIX_DOMAIN = {
    "nt_core": "core",
    "nt_memory": "memory",
    "nt_mind": "mind",
    "nt_io": "io",
    "nt_world": "world",
    "nt_shield": "shield",
    "nt_act": "act",
    "nt_repair": "repair",
    "nt_agent": "act",
    "nt_evidence": "memory",
    "nt_temporal": "world",
    "nt_latent": "core",
    "nt_discovery": "world",
    "nt_tools": "act",
    "nt_cap": "core",
    "nt_multimodal": "io",
    "nt_http": "io",
    "nt_file": "io",
    "nt_normalizer": "world",
    "nt_pack": "core",
    "nt_absorb": "mind",
}

# impl-layer dir -> domain fallback (when prefix unknown)
IMPL_DOMAIN = {
    "l1_body_impl": "shield",
    "l2_world_impl": "world",
    "l3_memory_impl": "memory",
    "l4_cognition_impl": "core",
    "l5_consciousness_impl": "core",
    "l6_self_impl": "core",
    "l7_capability_impl": "mind",
    "l8_autonomic_impl": "mind",
    "l9_transcendent_impl": "core",
    "l10_transcendent_impl": "core",
}

# impl-layer dir -> layer (file lives here => module is this kind of node)
IMPL_LAYER = {
    "l0_substrate": "l0primitive",
    "l1_body_impl": "l1composite",
    "l2_world_impl": "l1composite",
    "l3_memory_impl": "l1composite",
    "l4_cognition_impl": "l2orchestrator",
    "l5_consciousness_impl": "l2orchestrator",
    "l6_self_impl": "l2orchestrator",
    "l7_capability_impl": "l3domainservice",
    "l8_autonomic_impl": "l3domainservice",
    "l9_transcendent_impl": "l3domainservice",
    "l10_transcendent_impl": "l3domainservice",
}

CORE_LAYER = "l2orchestrator"  # core/*.rs top-level modules

SKIP_FILES = {"mod.rs", "main.rs", "lib.rs", "kani_proofs.rs"}

PUB_FN = re.compile(r"pub\s+(?:async\s+)?fn\s+([a-z_][a-z0-9_]*)")
USE_NT = re.compile(r"(?:use|::)\s+(?:crate::[a-z0-9_]+::)*(nt_[a-z0-9_]+)(?:::|\b)")
FN_TO_CAP = lambda n: re.sub(r"[_]+", "-", n).strip("-")


def to_kebab(fn_name: str) -> str:
    return re.sub(r"_+", "-", fn_name).strip("-")


def module_id(mod: str) -> str:
    """module -> stable id: nt_core_self -> nt_core_self"""
    return mod


def scan_codebase(root: str):
    """Return (nodes: list[dict], edges: list[tuple], uses: dict mod->set(mod))"""
    src_dir = os.path.join(root, SRC)
    nodes = []
    edge_src: dict[str, set[str]] = defaultdict(set)
    seen_ids = set()

    def add_file(path, rel):
        base = os.path.basename(path)
        if base in SKIP_FILES:
            return
        if not base.startswith("nt_") and not base.startswith("nt-"):
            return
        mod = base[:-3] if base.endswith(".rs") else base
        if mod in seen_ids:
            return
        # domain: prefix match first, then impl-layer dir
        domain = None
        for pref, d in PREFIX_DOMAIN.items():
            if mod.startswith(pref):
                domain = d
                break
        if domain is None:
            for impl_dir, d in IMPL_DOMAIN.items():
                if impl_dir in rel:
                    domain = d
                    break
        if domain is None:
            domain = "core"
        # layer: impl-layer dir, else core top-level
        layer = None
        for impl_dir, lyr in IMPL_LAYER.items():
            if impl_dir in rel:
                layer = lyr
                break
        if layer is None:
            layer = CORE_LAYER
        # caps: pub fn names (kebab-cased)
        caps = []
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            for m in PUB_FN.finditer(content):
                cap = to_kebab(m.group(1))
                if cap and cap not in caps:
                    caps.append(cap)
        except OSError:
            pass
        if not caps:
            caps = [to_kebab(mod.replace("nt_", ""))]
        nodes.append({"id": mod, "domain": domain, "layer": layer, "caps": caps[:8]})
        seen_ids.add(mod)
        # dependencies: use crate::nt_*
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            for m in USE_NT.finditer(content):
                dep = m.group(1)
                if dep != mod:
                    edge_src[mod].add(dep)
        except OSError:
            pass

    def walk(d):
        for name in sorted(os.listdir(d)):
            p = os.path.join(d, name)
            if os.path.isdir(p):
                walk(p)
            elif name.endswith(".rs"):
                rel = os.path.relpath(p, root)
                add_file(p, rel)

    walk(src_dir)

    # edges: only keep deps where both ends are known nodes
    edges = []
    for src, deps in edge_src.items():
        for dep in sorted(deps):
            if src in seen_ids and dep in seen_ids:
                edges.append([src, dep])
    edges.sort()

    return nodes, edges


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    root = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else None
    nodes, edges = scan_codebase(root)
    galaxy = {"nodes": nodes, "edges": edges}
    js = "const GALAXY = " + json.dumps(galaxy, ensure_ascii=False) + ";\n"
    if out:
        with open(out, "w", encoding="utf-8") as f:
            f.write(js)
        print(f"wrote {len(nodes)} nodes, {len(edges)} edges -> {out}")
    else:
        print(json.dumps({"nodes": len(nodes), "edges": len(edges)}, indent=2))


if __name__ == "__main__":
    main()