' IBI News - serve this folder on http://localhost:9122/ (office laptop only), hidden.
' CEO, 13 Oct 2026: "Can we give it a permanent local host link". Started by the
' "IBI SocialFlow Keep Alive" task (IBI Social Flow\ensure-running.bat) whenever :9122 is not listening.
' Bound to 127.0.0.1, so only this laptop can open it. The live public site stays
' https://news.indiabusinessinternational.online (GitHub Pages).
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = here
sh.Run """C:\Python314\python.exe"" -m http.server 9122 --bind 127.0.0.1 --directory """ & here & """", 0, False
