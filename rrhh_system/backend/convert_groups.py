
import sys

input_file = 'groups_dump.json'
output_file = 'groups_dump_utf8.json'

try:
    with open(input_file, 'r', encoding='cp1252') as f:
        content = f.read()
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Successfully converted {input_file} to {output_file}")
    
except Exception as e:
    print(f"Conversion failed: {e}")
