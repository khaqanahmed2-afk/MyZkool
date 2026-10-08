import zipfile
import xml.etree.ElementTree as ET

docx_path = 'docs/MyZkool - PRD, TRD, App Flow, UI UX Brief, Schema and Implementation Plan (Onboarding, Student, Fee, Transport, Website) (1).docx'

namespaces = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
}

with zipfile.ZipFile(docx_path) as z:
    xml_content = z.read('word/document.xml')
    root = ET.fromstring(xml_content)

body = root.find('w:body', namespaces)

def get_text(element):
    texts = []
    for node in element.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
        if node.text:
            texts.append(node.text)
    return ''.join(texts)

md_lines = []

for child in body:
    tag = child.tag.split('}')[-1]
    if tag == 'p':
        p_text = get_text(child).strip()
        if p_text:
            pStyle = child.find('.//w:pStyle', namespaces)
            style_val = pStyle.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val') if pStyle is not None else ''
            if style_val.startswith('Heading1') or style_val == '1':
                md_lines.append(f'# {p_text}\n')
            elif style_val.startswith('Heading2') or style_val == '2':
                md_lines.append(f'## {p_text}\n')
            elif style_val.startswith('Heading3') or style_val == '3':
                md_lines.append(f'### {p_text}\n')
            else:
                md_lines.append(f'{p_text}\n')
    elif tag == 'tbl':
        rows = []
        for tr in child.findall('w:tr', namespaces):
            row = []
            for tc in tr.findall('w:tc', namespaces):
                tc_text = ' '.join(get_text(p).strip() for p in tc.findall('w:p', namespaces))
                tc_text = tc_text.replace('\n', ' ').strip()
                row.append(tc_text)
            rows.append(row)
        if rows:
            header = rows[0]
            md_lines.append('| ' + ' | '.join(header) + ' |')
            md_lines.append('| ' + ' | '.join(['---'] * len(header)) + ' |')
            for r in rows[1:]:
                padded_r = r + [''] * (len(header) - len(r)) if len(r) < len(header) else r[:len(header)]
                md_lines.append('| ' + ' | '.join(padded_r) + ' |')
            md_lines.append('')

with open('docs/SPEC.md', 'w', encoding='utf-8') as f:
    f.write('\n'.join(md_lines))

print(f'Wrote docs/SPEC.md successfully. Total lines: {len(md_lines)}')
