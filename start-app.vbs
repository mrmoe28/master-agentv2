' Start Master Agent: run dev server hidden, then open browser to the app
Option Explicit
Dim WshShell, fso, projectDir, url, maxWait, waited, req

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
url = "http://localhost:6001"
maxWait = 60

' Start dev server hidden (0 = hide window, False = don't wait)
WshShell.Run "cmd /c cd /d """ & projectDir & """ && npm run dev", 0, False

' Wait for server to respond
waited = 0
Do While waited < maxWait
  WScript.Sleep 1000
  waited = waited + 1
  On Error Resume Next
  Set req = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  req.open "GET", url, False
  req.setTimeouts 2000, 2000, 2000, 2000
  req.send
  If Err.Number = 0 And req.Status = 200 Then Exit Do
  On Error Goto 0
Loop

' Open app in default browser
WshShell.Run url
