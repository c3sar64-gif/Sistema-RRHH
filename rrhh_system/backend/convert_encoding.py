
import sys

input_file = 'data_dump.json'
output_file = 'data_dump_utf8.json'

try:
    # Try reading as cp1252 (standard Windows) first
    with open(input_file, 'r', encoding='cp1252') as f:
        content = f.read()
    
    # Write as utf-8
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Successfully converted {input_file} to {output_file} (UTF-8)")
    
except Exception as e:
    print(f"Conversion failed: {e}")
