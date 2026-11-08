import os
import zipfile
import shutil

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_ZIP = os.path.join(ROOT_DIR, "dist", "FreezeFix-v1.1.0-ChromeExtension.zip")

os.makedirs(os.path.join(ROOT_DIR, "dist"), exist_ok=True)

# Extension runtime files and directories
INCLUDE_FILES = [
    "manifest.json",
    "background.js",
    "index.html",
    "style.css",
    "heart.html",
    "LICENSE",
]

INCLUDE_DIRS = [
    "icons",
    "js",
]

print(f"Creating extension ZIP: {OUTPUT_ZIP}")

if os.path.exists(OUTPUT_ZIP):
    os.remove(OUTPUT_ZIP)

with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zipf:
    for filename in INCLUDE_FILES:
        filepath = os.path.join(ROOT_DIR, filename)
        if os.path.exists(filepath):
            zipf.write(filepath, arcname=filename)
            print(f"  + Added file: {filename}")
        else:
            print(f"  ! Warning: {filename} not found!")

    for dirname in INCLUDE_DIRS:
        dirpath = os.path.join(ROOT_DIR, dirname)
        if os.path.exists(dirpath):
            for root, _, files in os.walk(dirpath):
                for file in files:
                    if file.endswith((".js", ".png", ".jpg", ".svg", ".css")):
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, ROOT_DIR)
                        zipf.write(full_path, arcname=rel_path)
                        print(f"  + Added: {rel_path}")

print(f"\nSuccessfully generated {OUTPUT_ZIP}")
print(f"Size: {os.path.getsize(OUTPUT_ZIP) / 1024:.1f} KB")

# Verification
print("\nVerifying archive contents:")
with zipfile.ZipFile(OUTPUT_ZIP, "r") as z:
    names = z.namelist()
    print(f"Total files in archive: {len(names)}")
    assert "manifest.json" in names, "manifest.json missing!"
    assert "background.js" in names, "background.js missing!"
    assert "index.html" in names, "index.html missing!"
    assert "icons/icon128.png" in names, "icon128.png missing!"
    for n in names:
        assert not n.startswith((".git", "node_modules", "dist", ".env")), f"Forbidden file found: {n}"
        assert not n.endswith((".py", ".md", ".zip")), f"Forbidden extension found: {n}"
print("All extension store compliance checks passed cleanly!")
