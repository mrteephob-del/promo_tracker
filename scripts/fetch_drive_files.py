import urllib.request
import re
import json

folders = [
    ('CJ More', '1GIQ223A9uHqgR5WtVcngFWajMyipl8H_'),
    ('Lotus Go Fresh', '18cbaW_RRyBZ8g5Jo3O_77A6zP7V1IyHV'),
    ('Mini BigC', '11sMay_G2FeMaVdvHFpgFkixLFWhWSGQJ'),
]

all_files = {}

def fix_mojibake(s):
    try:
        return s.encode('latin1').decode('utf-8')
    except Exception:
        return s

for name, fid in folders:
    url = f'https://drive.google.com/drive/folders/{fid}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8', errors='ignore')

    unescaped = html.encode('utf-8').decode('unicode_escape', errors='ignore')
    
    matches = re.findall(r'\["([a-zA-Z0-9_-]{25,})",\s*\["[a-zA-Z0-9_-]+"\],\s*"([^"]+?\.(?:jpg|jpeg|png|JPG|PNG))"', unescaped)
    print(f'{name} ({fid}): found {len(matches)} files')
    for file_id, filename in matches:
        clean_name = fix_mojibake(filename.strip())
        all_files[clean_name] = {
            'file_id': file_id,
            'filename': clean_name,
            'store': name,
            'view_url': f'https://drive.google.com/file/d/{file_id}/view?usp=drivesdk',
            'thumb_url': f'https://lh3.googleusercontent.com/d/{file_id}=w800',
        }

print(f'Total unique files found: {len(all_files)}')

with open('src/data/drive_images_map.json', 'w', encoding='utf-8') as f:
    json.dump(all_files, f, ensure_ascii=False, indent=2)

print('Saved to src/data/drive_images_map.json')
