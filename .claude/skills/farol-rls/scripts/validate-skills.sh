#!/usr/bin/env bash
# Valida todas as skills locais e os links de comunidade sem alterar arquivos.
# Dependências: Bash, Python 3 e PyYAML (python3 -m pip install PyYAML).
set -euo pipefail
cd "$(dirname "$0")/../../../.."
python3 - <<'PY'
from pathlib import Path
import re
import yaml

expected = {
    'farol-sync-rules', 'farol-rls', 'farol-notifications',
    'farol-performance', 'farol-connector',
}
seen = {}
paths = sorted(Path('.claude/skills').glob('*/SKILL.md'))
assert paths, 'Nenhuma skill encontrada'
for path in paths:
    text = path.read_text()
    match = re.match(r'\A---\r?\n(.*?)\r?\n---\r?\n(.*)\Z', text, re.S)
    assert match, f'{path}: frontmatter ausente ou delimitadores inválidos'
    data = yaml.safe_load(match[1])
    assert isinstance(data, dict), f'{path}: YAML precisa ser mapping'
    for key in ('name', 'description'):
        assert isinstance(data.get(key), str) and data[key].strip(), f'{path}: {key} vazio/inválido'
    name = data['name']
    assert name not in seen, f'Nome duplicado: {name}: {seen.get(name)} / {path}'
    assert name == path.parent.name, f'{path}: name difere do diretório'
    assert match[2].strip(), f'{path}: corpo vazio'
    if name in expected:
        assert re.fullmatch(r'[a-z][a-z0-9-]{0,63}', name), f'{path}: name inválido'
        assert data['description'].startswith('Use when'), f'{path}: description precisa de Use when'
        assert len(data['description']) <= 60, f'{path}: description longa'
        assert not path.parent.is_symlink(), f'{path}: skill de projeto não deve substituir link'
    seen[name] = str(path)
    print(f'PASS {path}')
assert expected <= seen.keys(), f'Skills de projeto ausentes: {expected - seen.keys()}'
for directory in Path('.claude/skills').iterdir():
    if directory.is_symlink():
        assert (directory / 'SKILL.md').is_file(), f'Link de comunidade quebrado: {directory}'
community = set(seen) - expected
print(f'PASS {len(expected)} skills novas + {len(community)} existentes = {len(paths)}; nomes únicos, sem conflito')
print('INFO farol-native-ui (sexta skill de projeto) pertence à F0-09b; não exigida nesta lane')
PY
