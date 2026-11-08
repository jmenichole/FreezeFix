import os
import json
import zipfile
import shutil

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(ROOT_DIR, "dist")
os.makedirs(DIST_DIR, exist_ok=True)

manifest_file = os.path.join(ROOT_DIR, "manifest.json")
with open(manifest_file, "r", encoding="utf-8") as f:
    manifest_data = json.load(f)

version = manifest_data.get("version", "1.1.1")
OUTPUT_ZIP = os.path.join(DIST_DIR, f"FreezeFix-v{version}-ChromeExtension.zip")
LEGACY_ZIP = os.path.join(DIST_DIR, "FreezeFix-v1.1.0-ChromeExtension.zip")
UNPACKED_DIR = os.path.join(DIST_DIR, "FreezeFix-ChromeExtension-Unpacked")

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

print(f"Creating extension ZIP for version {version}: {OUTPUT_ZIP}")

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

# Copy to legacy filename as well so both exist
shutil.copyfile(OUTPUT_ZIP, LEGACY_ZIP)

print(f"\nSuccessfully generated {OUTPUT_ZIP} ({os.path.getsize(OUTPUT_ZIP) / 1024:.1f} KB)")

# Extract to unpacked folder for instant browser testing
if os.path.exists(UNPACKED_DIR):
    shutil.rmtree(UNPACKED_DIR)
os.makedirs(UNPACKED_DIR, exist_ok=True)

with zipfile.ZipFile(OUTPUT_ZIP, "r") as z:
    z.extractall(UNPACKED_DIR)

print(f"Extracted clean unpacked extension to: {UNPACKED_DIR}")

# Verification
with zipfile.ZipFile(OUTPUT_ZIP, "r") as z:
    names = z.namelist()
    assert "manifest.json" in names, "manifest.json missing!"
    assert "background.js" in names, "background.js missing!"
    assert "index.html" in names, "index.html missing!"
    assert "icons/icon128.png" in names, "icon128.png missing!"
    
    with z.open("manifest.json") as mf:
        m_check = json.load(mf)
        perms = m_check.get("permissions", [])
        assert "storage" not in perms, "storage permission still present!"
        assert "sidePanel" in perms, "sidePanel permission missing!"
        assert "activeTab" in perms, "activeTab permission missing!"
        print(f"Verified manifest permissions: {perms}")

print("All CWS compliance and minimal-permissions checks PASSED cleanly!")
