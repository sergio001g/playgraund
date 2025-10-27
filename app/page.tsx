"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Check, Download } from "lucide-react"

const HTML_TAGS = [
  "div",
  "span",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
  "img",
  "ul",
  "ol",
  "li",
  "button",
  "input",
  "form",
  "header",
  "footer",
  "nav",
  "section",
  "article",
  "main",
  "table",
  "tr",
  "td",
  "th",
  "thead",
  "tbody",
  "video",
  "audio",
  "canvas",
  "svg",
  "iframe",
]

const CSS_PROPERTIES = [
  "color",
  "background",
  "background-color",
  "border",
  "border-radius",
  "padding",
  "margin",
  "width",
  "height",
  "display",
  "flex",
  "grid",
  "position",
  "top",
  "left",
  "right",
  "bottom",
  "font-size",
  "font-family",
  "font-weight",
  "text-align",
  "justify-content",
  "align-items",
  "gap",
  "opacity",
  "transform",
  "transition",
  "animation",
  "z-index",
  "overflow",
  "cursor",
  "box-shadow",
]

const JS_KEYWORDS = [
  "const",
  "let",
  "var",
  "function",
  "if",
  "else",
  "for",
  "while",
  "return",
  "class",
  "import",
  "export",
  "async",
  "await",
  "try",
  "catch",
  "throw",
  "new",
  "this",
  "console.log",
  "document.querySelector",
  "document.getElementById",
  "addEventListener",
  "setTimeout",
  "setInterval",
]

export default function CodePlayground() {
  const [html, setHtml] = useState("")
  const [css, setCss] = useState("")
  const [js, setJs] = useState("")
  const [externalPasteEnabled, setExternalPasteEnabled] = useState(false)
  const [showPasteWarning, setShowPasteWarning] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestionIndex, setSuggestionIndex] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 })
  const [htmlErrorLines, setHtmlErrorLines] = useState<number[]>([])
  const [cssErrorLines, setCssErrorLines] = useState<number[]>([])
  const [jsErrorLines, setJsErrorLines] = useState<number[]>([])
  const [activeEditor, setActiveEditor] = useState<"html" | "css" | "js">("html")

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null)
  const cssTextareaRef = useRef<HTMLTextAreaElement>(null)
  const jsTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const savedHtml = localStorage.getItem("playground-html")
    const savedCss = localStorage.getItem("playground-css")
    const savedJs = localStorage.getItem("playground-js")

    if (savedHtml !== null) setHtml(savedHtml)
    if (savedCss !== null) setCss(savedCss)
    if (savedJs !== null) setJs(savedJs)
  }, [])

  useEffect(() => {
    localStorage.setItem("playground-html", html)
    checkHtmlErrors(html)
  }, [html])

  useEffect(() => {
    localStorage.setItem("playground-css", css)
    checkCssErrors(css)
  }, [css])

  useEffect(() => {
    localStorage.setItem("playground-js", js)
    checkJsErrors(js)
  }, [js])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5" || (e.ctrlKey && e.key === "r") || (e.metaKey && e.key === "r")) {
        e.preventDefault()

        const response = prompt('Escribe "todo" para borrar todo el código, o presiona Enter para solo recargar:')

        if (response !== null) {
          if (response.toLowerCase() === "todo") {
            localStorage.removeItem("playground-html")
            localStorage.removeItem("playground-css")
            localStorage.removeItem("playground-js")
            setHtml("")
            setCss("")
            setJs("")
          }
          window.location.reload()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) return

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>${css}</style>
        </head>
        <body>
          ${html}
          <script>
            try {
              ${js}
            } catch (error) {
              console.error('Error en JS:', error);
            }
          </script>
        </body>
      </html>
    `

    iframeDoc.open()
    iframeDoc.write(content)
    iframeDoc.close()
  }, [html, css, js])

  const checkHtmlErrors = (code: string) => {
    const lines = code.split("\n")
    const errorLines: number[] = []
    const tagStack: Array<{ tag: string; line: number }> = []

    lines.forEach((line, index) => {
      const openTags = line.match(/<([a-z][a-z0-9]*)[^>]*>/gi) || []
      const closeTags = line.match(/<\/([a-z][a-z0-9]*)>/gi) || []

      openTags.forEach((tag) => {
        const tagName = tag.match(/<([a-z][a-z0-9]*)/i)?.[1]
        if (tagName && !["img", "br", "hr", "input", "meta", "link"].includes(tagName.toLowerCase())) {
          tagStack.push({ tag: tagName, line: index })
        }
      })

      closeTags.forEach((tag) => {
        const tagName = tag.match(/<\/([a-z][a-z0-9]*)>/i)?.[1]
        if (tagName) {
          const lastOpen = tagStack.pop()
          if (!lastOpen || lastOpen.tag.toLowerCase() !== tagName.toLowerCase()) {
            errorLines.push(index)
          }
        }
      })
    })

    tagStack.forEach((unclosed) => {
      errorLines.push(unclosed.line)
    })

    setHtmlErrorLines([...new Set(errorLines)])
  }

  const checkCssErrors = (code: string) => {
    const lines = code.split("\n")
    const errorLines: number[] = []
    let braceCount = 0

    lines.forEach((line, index) => {
      const openBraces = (line.match(/{/g) || []).length
      const closeBraces = (line.match(/}/g) || []).length

      braceCount += openBraces - closeBraces

      if (braceCount < 0) {
        errorLines.push(index)
      }
    })

    if (braceCount !== 0) {
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes("{") || lines[i].includes("}")) {
          errorLines.push(i)
          break
        }
      }
    }

    setCssErrorLines([...new Set(errorLines)])
  }

  const checkJsErrors = (code: string) => {
    const lines = code.split("\n")
    const errorLines: number[] = []

    try {
      new Function(code)
    } catch (error: unknown) {
      if (error instanceof Error) {
        const match = error.message.match(/line (\d+)/i)
        if (match) {
          const lineNum = Number.parseInt(match[1]) - 1
          errorLines.push(lineNum)
        } else {
          let braceCount = 0
          let parenCount = 0
          let bracketCount = 0

          lines.forEach((line, index) => {
            braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length
            parenCount += (line.match(/$$/g) || []).length - (line.match(/$$/g) || []).length
            bracketCount += (line.match(/\[/g) || []).length - (line.match(/\]/g) || []).length

            if (braceCount < 0 || parenCount < 0 || bracketCount < 0) {
              errorLines.push(index)
            }
          })

          if (braceCount !== 0 || parenCount !== 0 || bracketCount !== 0) {
            for (let i = lines.length - 1; i >= 0; i--) {
              if (
                lines[i].includes("{") ||
                lines[i].includes("}") ||
                lines[i].includes("(") ||
                lines[i].includes(")")
              ) {
                errorLines.push(i)
                break
              }
            }
          }
        }
      }
    }

    setJsErrorLines([...new Set(errorLines)])
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!externalPasteEnabled) {
      const clipboardData = e.clipboardData
      const pastedText = clipboardData.getData("text")

      const isInternalCopy =
        clipboardData.types.includes("text/html") && clipboardData.getData("text/html").includes("data-internal-copy")

      if (!isInternalCopy && pastedText) {
        e.preventDefault()
        setShowPasteWarning(true)
        setTimeout(() => setShowPasteWarning(false), 2000)
      }
    }
  }

  const handleCopy = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const selection = window.getSelection()?.toString()
    if (selection) {
      e.clipboardData.setData("text/plain", selection)
      e.clipboardData.setData("text/html", `<span data-internal-copy="true">${selection}</span>`)
      e.preventDefault()
    }
  }

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setHtml(newValue)

    const cursorPos = e.target.selectionStart
    const textBeforeCursor = newValue.substring(0, cursorPos)

    const lastChar = textBeforeCursor[textBeforeCursor.length - 1]
    if (lastChar === "<") {
      setSuggestions(HTML_TAGS)
      setSuggestionIndex(0)
      setShowSuggestions(true)
      setActiveEditor("html")

      const textarea = e.target
      const lines = textBeforeCursor.split("\n")
      const currentLine = lines.length
      const lineHeight = 20
      const top = currentLine * lineHeight

      setSuggestionPosition({ top, left: 60 })
    } else if (lastChar === ">") {
      setShowSuggestions(false)
    } else if (showSuggestions && activeEditor === "html") {
      const tagMatch = textBeforeCursor.match(/<([a-z0-9]*)$/i)
      if (tagMatch) {
        const partial = tagMatch[1].toLowerCase()
        const filtered = HTML_TAGS.filter((tag) => tag.startsWith(partial))
        setSuggestions(filtered)
        setSuggestionIndex(0)
      } else {
        setShowSuggestions(false)
      }
    }
  }

  const handleCssChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setCss(newValue)

    const cursorPos = e.target.selectionStart
    const textBeforeCursor = newValue.substring(0, cursorPos)
    const lines = textBeforeCursor.split("\n")
    const currentLine = lines[lines.length - 1]

    // Detectar si está escribiendo una propiedad CSS (después de { o ;)
    const isWritingProperty = /[{;]\s*[a-z-]*$/i.test(currentLine)

    if (isWritingProperty) {
      const match = currentLine.match(/[{;]\s*([a-z-]*)$/i)
      if (match) {
        const partial = match[1].toLowerCase()
        const filtered = CSS_PROPERTIES.filter((prop) => prop.startsWith(partial))
        if (filtered.length > 0) {
          setSuggestions(filtered)
          setSuggestionIndex(0)
          setShowSuggestions(true)
          setActiveEditor("css")

          const lineCount = lines.length
          const lineHeight = 20
          const top = lineCount * lineHeight

          setSuggestionPosition({ top, left: 60 })
        }
      }
    } else {
      if (showSuggestions && activeEditor === "css") {
        setShowSuggestions(false)
      }
    }
  }

  const handleJsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setJs(newValue)

    const cursorPos = e.target.selectionStart
    const textBeforeCursor = newValue.substring(0, cursorPos)
    const lines = textBeforeCursor.split("\n")
    const currentLine = lines[lines.length - 1]

    // Detectar si está escribiendo una palabra clave
    const match = currentLine.match(/\b([a-z.]*)\s*$/i)
    if (match) {
      const partial = match[1].toLowerCase()
      const filtered = JS_KEYWORDS.filter((keyword) => keyword.toLowerCase().startsWith(partial))
      if (filtered.length > 0 && partial.length > 0) {
        setSuggestions(filtered)
        setSuggestionIndex(0)
        setShowSuggestions(true)
        setActiveEditor("js")

        const lineCount = lines.length
        const lineHeight = 20
        const top = lineCount * lineHeight

        setSuggestionPosition({ top, left: 60 })
      } else {
        if (showSuggestions && activeEditor === "js") {
          setShowSuggestions(false)
        }
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, editor: "html" | "css" | "js") => {
    if (showSuggestions && activeEditor === editor) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSuggestionIndex((prev) => (prev + 1) % suggestions.length)
        return
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
        return
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        insertSuggestion(suggestions[suggestionIndex], editor)
        return
      } else if (e.key === "Escape") {
        setShowSuggestions(false)
        return
      }
    }

    // Autocompletado de etiquetas HTML
    if (editor === "html") {
      const textarea = e.currentTarget
      const cursorPos = textarea.selectionStart
      const textBeforeCursor = html.substring(0, cursorPos)

      const tagMatch = textBeforeCursor.match(/<([a-z][a-z0-9]*)\s*$/i)

      if (tagMatch && e.key === ">") {
        const tagName = tagMatch[1]
        const closingTag = `></${tagName}>`
        const newHtml = html.substring(0, cursorPos) + closingTag + html.substring(cursorPos)

        setTimeout(() => {
          setHtml(newHtml)
          textarea.selectionStart = cursorPos + 1
          textarea.selectionEnd = cursorPos + 1
        }, 0)
      }
    }
  }

  const insertSuggestion = (suggestion: string, editor: "html" | "css" | "js") => {
    const textarea =
      editor === "html" ? htmlTextareaRef.current : editor === "css" ? cssTextareaRef.current : jsTextareaRef.current

    if (!textarea) return

    const currentValue = editor === "html" ? html : editor === "css" ? css : js
    const setValue = editor === "html" ? setHtml : editor === "css" ? setCss : setJs

    const cursorPos = textarea.selectionStart
    const textBeforeCursor = currentValue.substring(0, cursorPos)
    const textAfterCursor = currentValue.substring(cursorPos)

    let newValue = ""
    let newCursorPos = cursorPos

    if (editor === "html") {
      const tagStart = textBeforeCursor.lastIndexOf("<")
      const beforeTag = currentValue.substring(0, tagStart)
      newValue = beforeTag + `<${suggestion}></${suggestion}>` + textAfterCursor
      newCursorPos = tagStart + suggestion.length + 2
    } else if (editor === "css") {
      const propStart = textBeforeCursor.search(/[{;]\s*[a-z-]*$/i)
      const match = textBeforeCursor.match(/([{;]\s*)([a-z-]*)$/i)
      if (match) {
        const beforeProp = currentValue.substring(0, propStart + match[1].length)
        newValue = beforeProp + `${suggestion}: ` + textAfterCursor
        newCursorPos = beforeProp.length + suggestion.length + 2
      }
    } else {
      const wordStart = textBeforeCursor.search(/\b[a-z.]*$/i)
      const beforeWord = currentValue.substring(0, wordStart)
      newValue = beforeWord + suggestion + textAfterCursor
      newCursorPos = beforeWord.length + suggestion.length
    }

    setValue(newValue)
    setShowSuggestions(false)

    setTimeout(() => {
      textarea.selectionStart = newCursorPos
      textarea.selectionEnd = newCursorPos
      textarea.focus()
    }, 0)
  }

  const toggleExternalPaste = () => {
    setExternalPasteEnabled(!externalPasteEnabled)
  }

  const downloadZip = async () => {
    const JSZip = (await import("jszip")).default
    const zip = new JSZip()

    const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mi Proyecto</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  ${html}
  <script src="script.js"></script>
</body>
</html>`

    zip.file("index.html", fullHtml)
    zip.file("style.css", css)
    zip.file("script.js", js)

    const blob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "codigo-playground.zip"
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderLineNumbers = (code: string, errorLines: number[]) => {
    const lines = code.split("\n")
    return lines.map((_, index) => (
      <div key={index} className="h-5 flex items-center justify-center relative">
        {errorLines.includes(index) && (
          <div className="absolute left-0 w-2 h-2 bg-red-500 rounded-full" title={`Error en línea ${index + 1}`}></div>
        )}
      </div>
    ))
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      {showPasteWarning && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 font-mono text-sm animate-in fade-in slide-in-from-top-2">
          No puedes copiar contenido externo
        </div>
      )}

      <div className="h-12 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full transition-colors ${htmlErrorLines.length > 0 ? "bg-red-500" : "bg-zinc-700 opacity-30"}`}
            title={htmlErrorLines.length > 0 ? `${htmlErrorLines.length} errores en HTML` : ""}
          ></div>
          <div
            className={`w-3 h-3 rounded-full transition-colors cursor-pointer hover:opacity-50 relative group ${cssErrorLines.length > 0 ? "bg-red-500" : "bg-zinc-700 opacity-30"}`}
            onClick={toggleExternalPaste}
            title={cssErrorLines.length > 0 ? `${cssErrorLines.length} errores en CSS` : ""}
          >
            {externalPasteEnabled && <Check className="absolute -top-1 -right-1 w-4 h-4 text-green-500" />}
          </div>
          <div
            className={`w-3 h-3 rounded-full transition-colors ${jsErrorLines.length > 0 ? "bg-red-500" : "bg-zinc-700 opacity-30"}`}
            title={jsErrorLines.length > 0 ? `${jsErrorLines.length} errores en JS` : ""}
          ></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-zinc-600 font-mono">Live Code Playground</div>
          <button
            onClick={downloadZip}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs font-mono transition-colors"
            title="Descargar código"
          >
            <Download className="w-3.5 h-3.5" />
            ZIP
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col lg:w-1/2 border-r border-zinc-800">
          <div className="flex-1 flex border-b border-zinc-800 relative">
            <div className="flex flex-col flex-1">
              <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4">
                <span className="text-sm font-mono text-orange-400">HTML</span>
              </div>
              <div className="flex-1 flex overflow-hidden">
                <div className="w-8 bg-zinc-900 border-r border-zinc-800 py-4 flex flex-col items-center gap-0 overflow-y-auto">
                  {renderLineNumbers(html, htmlErrorLines)}
                </div>
                <textarea
                  ref={htmlTextareaRef}
                  value={html}
                  onChange={handleHtmlChange}
                  onKeyDown={(e) => handleKeyDown(e, "html")}
                  onPaste={handlePaste}
                  onCopy={handleCopy}
                  className="flex-1 bg-zinc-950 text-gray-100 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-700 leading-5"
                  spellCheck={false}
                />
              </div>
            </div>
            {showSuggestions && activeEditor === "html" && (
              <div
                className="absolute bg-zinc-800 border border-zinc-700 rounded shadow-lg z-50 max-h-48 overflow-y-auto"
                style={{
                  top: `${suggestionPosition.top + 50}px`,
                  left: `${suggestionPosition.left}px`,
                  minWidth: "150px",
                }}
              >
                {suggestions.map((tag, index) => (
                  <div
                    key={tag}
                    className={`px-3 py-1.5 cursor-pointer font-mono text-sm ${
                      index === suggestionIndex ? "bg-zinc-700 text-orange-400" : "text-gray-300 hover:bg-zinc-700"
                    }`}
                    onClick={() => insertSuggestion(tag, "html")}
                  >
                    {tag}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 flex border-b border-zinc-800 relative">
            <div className="flex flex-col flex-1">
              <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4">
                <span className="text-sm font-mono text-blue-400">CSS</span>
              </div>
              <div className="flex-1 flex overflow-hidden">
                <div className="w-8 bg-zinc-900 border-r border-zinc-800 py-4 flex flex-col items-center gap-0 overflow-y-auto">
                  {renderLineNumbers(css, cssErrorLines)}
                </div>
                <textarea
                  ref={cssTextareaRef}
                  value={css}
                  onChange={handleCssChange}
                  onKeyDown={(e) => handleKeyDown(e, "css")}
                  onPaste={handlePaste}
                  onCopy={handleCopy}
                  className="flex-1 bg-zinc-950 text-gray-100 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-700 leading-5"
                  spellCheck={false}
                />
              </div>
            </div>
            {showSuggestions && activeEditor === "css" && (
              <div
                className="absolute bg-zinc-800 border border-zinc-700 rounded shadow-lg z-50 max-h-48 overflow-y-auto"
                style={{
                  top: `${suggestionPosition.top + 50}px`,
                  left: `${suggestionPosition.left}px`,
                  minWidth: "180px",
                }}
              >
                {suggestions.map((prop, index) => (
                  <div
                    key={prop}
                    className={`px-3 py-1.5 cursor-pointer font-mono text-sm ${
                      index === suggestionIndex ? "bg-zinc-700 text-blue-400" : "text-gray-300 hover:bg-zinc-700"
                    }`}
                    onClick={() => insertSuggestion(prop, "css")}
                  >
                    {prop}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 flex relative">
            <div className="flex flex-col flex-1">
              <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4">
                <span className="text-sm font-mono text-yellow-400">JavaScript</span>
              </div>
              <div className="flex-1 flex overflow-hidden">
                <div className="w-8 bg-zinc-900 border-r border-zinc-800 py-4 flex flex-col items-center gap-0 overflow-y-auto">
                  {renderLineNumbers(js, jsErrorLines)}
                </div>
                <textarea
                  ref={jsTextareaRef}
                  value={js}
                  onChange={handleJsChange}
                  onKeyDown={(e) => handleKeyDown(e, "js")}
                  onPaste={handlePaste}
                  onCopy={handleCopy}
                  className="flex-1 bg-zinc-950 text-gray-100 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-700 leading-5"
                  spellCheck={false}
                />
              </div>
            </div>
            {showSuggestions && activeEditor === "js" && (
              <div
                className="absolute bg-zinc-800 border border-zinc-700 rounded shadow-lg z-50 max-h-48 overflow-y-auto"
                style={{
                  top: `${suggestionPosition.top + 50}px`,
                  left: `${suggestionPosition.left}px`,
                  minWidth: "200px",
                }}
              >
                {suggestions.map((keyword, index) => (
                  <div
                    key={keyword}
                    className={`px-3 py-1.5 cursor-pointer font-mono text-sm ${
                      index === suggestionIndex ? "bg-zinc-700 text-yellow-400" : "text-gray-300 hover:bg-zinc-700"
                    }`}
                    onClick={() => insertSuggestion(keyword, "js")}
                  >
                    {keyword}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:w-1/2 bg-white">
          <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4">
            <span className="text-sm font-mono text-green-400">Preview</span>
          </div>
          <iframe
            ref={iframeRef}
            className="flex-1 w-full bg-white border-0"
            title="preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  )
}
