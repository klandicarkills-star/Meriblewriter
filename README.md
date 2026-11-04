# Merible Writer Android

Standalone Android WebView app. No Termux or Python server needed. Documents are saved in WebView localStorage on the device. DOCX and JSON backups use Android's file picker; PDF uses Android print > Save as PDF.

## Build on GitHub from your phone
1. Create a new GitHub repository, e.g. `MeribleWriter-Android`.
2. Upload **the contents of this ZIP** to the repository root (including `.github/workflows/android.yml`). GitHub's web uploader does not extract ZIP files; extract it first or use a Git client.
3. Open **Actions** > **Build Android APK** > **Run workflow** (or push to main).
4. Open the completed workflow run, download **MeribleWriter-debug-apk** from Artifacts, unzip it, then install `app-debug.apk`.
5. Android may ask you to allow installation from your browser/files app.

This is a debug-signed APK for personal testing, not a Play Store release. It has not been compiled or device-tested in this environment. Back up documents before uninstalling or clearing app data. Existing Termux/browser documents do not migrate automatically; export a JSON backup from the old app and restore it in the new one.
