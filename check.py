import re

with open('templates/index.html', encoding='utf-8') as f:
    html = f.read()

with open('static/js/main.js', encoding='utf-8') as f:
    js = f.read()

html_ids = set(re.findall(r'id=[\'\"]([^\'\"]+)[\'\"]', html))
js_created_ids = set(re.findall(r'id=[\'\"]([^\'\"]+)[\'\"]', js)) | set(re.findall(r'\.id\s*=\s*[\'\"]([^\'\"]+)[\'\"]', js))
all_created = html_ids | js_created_ids

js_refs = set(re.findall(r'getElementById\([\'\"]([^\'\"]+)[\"\']\)', js))

missing = js_refs - all_created
print('Strictly Missing IDs:')
for m in sorted(missing):
    print('-', m)
