$root = Get-Location

# Fix global style.css
$stylePath = Join-Path $root 'css\style.css'
$style = Get-Content -Raw $stylePath
$style = $style -replace "html,\s*body \{[\s\S]*?animation: gradientMove 55s ease infinite;\s*\}", "html, body {\n  margin: 0;\n  padding: 0;\n  color: var(--fg);\n  font-family: 'Inter', system-ui, Segoe UI, Roboto, sans-serif;\n  overflow-x: hidden;\n  background: linear-gradient(210deg, #090b10 0%, #11131a 40%, #151821 100%);\n  background-size: 400% 400%;\n  animation: gradientMove 55s ease infinite;\n  min-height: 100vh;\n}\n"
$style = $style -replace "body\.subpage main \{[\s\S]*?margin: 0 auto;\s*\}", "body.subpage main {\n  padding-top: calc(var(--header-height) + 6rem);\n  max-width: var(--max-w);\n  margin: 0 auto;\n  background: rgba(255, 255, 255, 0.03);\n  border: 1px solid rgba(255, 255, 255, 0.08);\n  backdrop-filter: blur(10px);\n  padding: 2rem;\n  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.03);\n}\n"
$style = $style -replace "\.btn \{[\s\S]*?border: none;\s*cursor: pointer;\s*transition: all 0.2s ease;\s*\}", ".btn {\n  font-family: 'Courier New', monospace;\n  background: rgba(255,255,255,0.08);\n  color: var(--fg);\n  font-weight: 700;\n  font-size: 1.05rem;\n  padding: 12px 20px;\n  text-decoration: none;\n  border: 1px solid rgba(255,255,255,0.12);\n  cursor: pointer;\n  transition: all 0.2s ease;\n  border-radius: 0;\n}\n"
$style = $style -replace "\.btn:hover \{[\s\S]*?\}", ".btn:hover {\n  background: rgba(255,255,255,0.14);\n}\n"
Set-Content -Path $stylePath -Value $style

# Fix chatbot style
$chatPath = Join-Path $root 'css\chatStyle.css'
$chat = Get-Content -Raw $chatPath
$chat = $chat -replace "body \{[\s\S]*?margin: 0;\}", "body {\n    box-sizing: border-box;\n    font-family: 'Courier New', monospace;\n    background: #090b10;\n    display: flex;\n    justify-content: center;\n    align-items: center;\n    min-height: 100vh;\n    margin: 0;\n}\n"
$chat = $chat -replace "\.chat-container \{[\s\S]*?box-shadow: 0 0 10px rgba\(0, 0, 0, 0.2\);\}", ".chat-container {\n    width: 100%;\n    max-width: 420px;\n    padding: 24px;\n    display: flex;\n    flex-direction: column;\n    gap: 18px;\n    font-family: 'Courier New', monospace;\n    background: rgba(255,255,255,0.06);\n    border: 1px solid rgba(255,255,255,0.12);\n    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);\n    border-radius: 0;\n}\n"
$chat = $chat -replace "button#run \{[\s\S]*?cursor: pointer;\}", "button#run {\n    align-self: flex-end;\n    padding: 10px 20px;\n    border: 1px solid rgba(255,255,255,0.18);\n    background: rgba(255,255,255,0.12);\n    color: white;\n    cursor: pointer;\n    font-family: 'Courier New', monospace;\n    border-radius: 0;\n}\n"
$chat = $chat -replace "\.input-area \{[\s\S]*?\}", ".input-area {\n    display: flex;\n    width: 100%;\n    background: rgba(255,255,255,0.05);\n    border: 1px solid rgba(255,255,255,0.12);\n    border-radius: 0;\n}\n"
$chat = $chat -replace "\.input-area input \{[\s\S]*?\}", ".input-area input {\n    font-family: 'Courier New', monospace;\n    flex: 1;\n    padding: 12px;\n    border: none;\n    outline: none;\n    background: rgba(255,255,255,0.08);\n    color: #ffffff;\n}\n"
$chat = $chat -replace "\.input-area button \{[\s\S]*?\}", ".input-area button {\n    padding: 12px 20px;\n    border: 1px solid rgba(255,255,255,0.18);\n    background: rgba(255,255,255,0.12);\n    color: white;\n    cursor: pointer;\n    border-radius: 0;\n}\n"
Set-Content -Path $chatPath -Value $chat

# Fix EZDAW style and cleanup broken tail
$ezPath = Join-Path $root 'css\ezdawStyle.css'
$ez = Get-Content -Raw $ezPath
$ez = $ez -replace "\/\* Esquinas cuadradas para EZDAW \*\/[^\n]*",""
$ez = $ez -replace "`n/\* EZDAW subpage style overrides to match chatbot/sandbox \*/[\s\S]*$",""
$ez = $ez -replace "\.wrap\.hero \{[\s\S]*?margin-top: 100px;\n\}", "main.wrap.section {\n    background: rgba(255,255,255,0.04);\n    width: 100%;\n    max-width: 1160px;\n    padding: 32px 28px 28px;\n    border: 1px solid rgba(255,255,255,0.12);\n    margin-top: 100px;\n}\n"
$ez = $ez -replace "\.controls \{[\s\S]*?box-shadow: inset 0 0 0 1px rgba\(255, 255, 255, 0.02\);\n\}", ".controls {\n    display: grid;\n    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));\n    align-items: center;\n    gap: 18px;\n    padding: 24px;\n    background: rgba(255,255,255,0.06);\n    border: 1px solid rgba(255,255,255,0.12);\n    margin-bottom: 25px;\n}\n"
$ez = $ez -replace "\.btn \{[\s\S]*?transition: transform 0.18s ease, box-shadow 0.18s ease;\n\}", ".btn {\n    background: rgba(255,255,255,0.08);\n    color: #fff;\n    border: 1px solid rgba(255,255,255,0.12);\n    padding: 14px 30px;\n    cursor: pointer;\n    font-family: var(--main-font);\n    font-weight: 800;\n    text-transform: uppercase;\n    letter-spacing: 0.08em;\n    border-radius: 0;\n    transition: transform 0.18s ease, box-shadow 0.18s ease;\n}\n"
$ez = $ez -replace "\.btn:hover \{[\s\S]*?\n\}", ".btn:hover {\n    transform: translateY(-1px);\n    box-shadow: 0 12px 24px rgba(255, 0, 127, 0.18);\n}\n"
$ez = $ez -replace "\.control-group \{[\s\S]*?border-radius: 16px;\n\}", ".control-group {\n    display: flex;\n    flex-direction: column;\n    gap: 10px;\n    padding: 16px 18px;\n    background: rgba(255,255,255,0.05);\n    border: 1px solid rgba(255,255,255,0.12);\n}\n"
$ez = $ez -replace "\.sequencer-wrapper \{[\s\S]*?overflow: hidden;\n\}", ".sequencer-wrapper {\n    display: grid;\n    grid-template-columns: 70px minmax(0, 1fr) 260px;\n    gap: 24px;\n    align-items: start;\n    padding: 24px;\n    border: 1px solid rgba(255,255,255,0.12);\n    margin-bottom: 30px;\n    background: rgba(255,255,255,0.05);\n    overflow: hidden;\n}\n"
$ez = $ez -replace "\.sequencer-relative-container \{[\s\S]*?justify-content: center;\n\}", ".sequencer-relative-container {\n    position: relative;\n    width: 100%;\n    min-width: 0;\n    max-width: 100%;\n    background: rgba(255,255,255,0.05);\n    border: 1px solid rgba(255,255,255,0.12);\n    padding: 18px;\n    display: flex;\n    justify-content: center;\n}\n"
$ez = $ez -replace "\.sequencer-grid \{[\s\S]*?min-width: max-content;\n\}", ".sequencer-grid {\n    display: grid;\n    grid-template-columns: repeat(16, 30px);\n    grid-template-rows: repeat(4, 45px);\n    gap: 8px;\n    background: rgba(255,255,255,0.05);\n    padding: 12px;\n    min-width: max-content;\n}\n"
$ez = $ez -replace "\.piano-roll-container \{[\s\S]*?box-shadow: inset 0 0 0 1px rgba\(255, 255, 255, 0.02\);\n\}", ".piano-roll-container {\n    border: 1px solid rgba(255,255,255,0.12);\n    background: rgba(255,255,255,0.04);\n    position: relative;\n    margin-bottom: 50px;\n    overflow: hidden;\n}\n"
$ez = $ez -replace "\.pad \{[\s\S]*?transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;\n\}", ".pad {\n    background: rgba(255,255,255,0.08);\n    border: 1px solid rgba(255,255,255,0.12);\n    cursor: pointer;\n    border-radius: 0;\n    width: 30px;\n    height: 45px;\n    transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;\n}\n"
$ez = $ez -replace "\.piano-pad \{[\s\S]*?transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;\n\}", ".piano-pad {\n    position: absolute;\n    height: 30px;\n    cursor: pointer;\n    border: 1px solid rgba(255,255,255,0.12);\n    background: rgba(255,255,255,0.06);\n    border-radius: 0;\n    transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;\n}\n"
Set-Content -Path $ezPath -Value $ez

Write-Host 'Style cleanup complete.'
