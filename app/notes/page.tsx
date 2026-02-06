'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bold, Italic, List, ListOrdered, Strikethrough, LogOut, Search, Pencil, Paperclip, X, Loader2, Trash2, AlertTriangle } from 'lucide-react'

interface Note {
  id: string
  content: string
  user_id: string
  category: string
  created_at: string
  file_url?: string 
}

const CATEGORIES = [
  { id: 'general', emoji: '🐾', color: 'bg-[#745e86] text-white', text: 'General' },
  { id: 'idea', emoji: '💡', color: 'bg-[#cfc694] text-[#78350F]', text: 'Idea' },
  { id: 'todo', emoji: '✅', color: 'bg-[#bbd6bc] text-white', text: 'Task' },
  { id: 'heart', emoji: '💖', color: 'bg-[#e2b3bc] text-white', text: 'Sweet' },
]

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [newNote, setNewNote] = useState('')
  const [selectedCat, setSelectedCat] = useState('general')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})
  const [fileUrl, setFileUrl] = useState<string | null>(null) 
  
  // Custom Alert State
  const [alert, setAlert] = useState<{show: boolean, title: string, message: string, onConfirm: () => void} | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const savedDraft = localStorage.getItem('note-draft')
    if (savedDraft && !editingId) setNewNote(savedDraft)
    fetchNotes()
  }, [])

  useEffect(() => {
    if (!editingId) {
      localStorage.setItem('note-draft', newNote)
    }
  }, [newNote, editingId])

  const fetchNotes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error) setNotes(data || [])
    }
  }

  const triggerAlert = (title: string, message: string, onConfirm: () => void) => {
    setAlert({ show: true, title, message, onConfirm })
  }

  const discardNote = () => {
    triggerAlert(
      "Discard Draft?", 
      "The bees worked hard on this! Are you sure you want to clear your current note?", 
      () => {
        setNewNote('')
        setFileUrl(null)
        setEditingId(null)
        localStorage.removeItem('note-draft')
        setAlert(null)
      }
    )
  }

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const { error: uploadError } = await supabase.storage
      .from('note-attachments')
      .upload(fileName, file)
    if (uploadError) return null
    const { data } = supabase.storage.from('note-attachments').getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    setIsUploading(true)
    const url = await uploadFile(e.target.files[0])
    if (url) setFileUrl(url)
    setIsUploading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = textareaRef.current
      if (!textarea) return
      const start = textarea.selectionStart
      const textBefore = textarea.value.substring(0, start)
      const lines = textBefore.split('\n')
      const currentLine = lines[lines.length - 1]
      let continuation = ''
      if (currentLine.trim().startsWith('* ')) {
        continuation = '* '
      } else {
        const numMatch = currentLine.match(/^(\d+)\.\s/)
        if (numMatch) continuation = `${parseInt(numMatch[1]) + 1}. `
      }
      if (continuation) {
        e.preventDefault()
        const textAfter = textarea.value.substring(start)
        const newText = textBefore + '\n' + continuation + textAfter
        setNewNote(newText)
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + continuation.length + 1
        }, 0)
      }
    }
  }

  const insertFormat = (type: 'bold' | 'italic' | 'bullet' | 'number' | 'strike') => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selection = text.substring(start, end)
    let before = '', after = '', cursorOffset = 0
    switch(type) {
      case 'bold': before = '**'; after = '**'; cursorOffset = 2; break
      case 'italic': before = '*'; after = '*'; cursorOffset = 1; break
      case 'strike': 
        if (!selection) return 
        const isListItem = selection.trim().startsWith('* ') || /^\d+\.\s/.test(selection.trim());
        if (isListItem) {
          const textBefore = text.substring(0, start), textAfter = text.substring(end)
          const cleanedMainText = (textBefore + textAfter).replace(/\n\s*\n/g, '\n').trim()
          const completedLine = `~~${selection.trim()}~~`, compHeader = "### 🍯 DONE & DUSTED"
          const separator = `\n\n---\n${compHeader}\n`
          const hasCompletedHeader = cleanedMainText.includes(compHeader)
          let finalNoteStr = hasCompletedHeader ? `${cleanedMainText}\n${completedLine}` : (cleanedMainText === '' ? `${compHeader}\n${completedLine}` : `${cleanedMainText}${separator}${completedLine}`)
          setNewNote(finalNoteStr)
          return
        } else { before = '~~'; after = '~~'; cursorOffset = 2 }
        break
      case 'bullet': before = (start === 0 || text[start - 1] === '\n' ? '' : '\n') + '* '; cursorOffset = before.length; break
      case 'number':
        const allLines = text.split('\n')
        const existingNums = new Set<number>()
        allLines.forEach(line => { const match = line.match(/(?:~~)?(\d+)\./); if (match) existingNums.add(parseInt(match[1])) })
        let nextNum = 1; while (existingNums.has(nextNum)) nextNum++
        before = (start === 0 || text[start - 1] === '\n' ? '' : '\n') + `${nextNum}. `; cursorOffset = before.length; break
    }
    setNewNote(text.substring(0, start) + before + selection + after + text.substring(end))
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + (selection ? before.length + selection.length + after.length : cursorOffset), start + (selection ? before.length + selection.length + after.length : cursorOffset))
    }, 0)
  }

  const addNote = async () => {
    if (!newNote.trim() || isProcessing || isUploading) return
    setIsProcessing(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const noteData = { content: newNote, category: selectedCat, file_url: fileUrl, user_id: user.id, title: 'Note' }
    if (editingId) {
      const { error } = await supabase.from('notes').update({ content: newNote, category: selectedCat, file_url: fileUrl }).eq('id', editingId)
      if (!error) {
        setNotes(prev => prev.map(n => n.id === editingId ? { ...n, content: newNote, category: selectedCat, file_url: fileUrl } : n))
        setEditingId(null); setNewNote(''); setFileUrl(null)
      }
    } else {
      const { error } = await supabase.from('notes').insert(noteData)
      if (!error) { setNewNote(''); setFileUrl(null); localStorage.removeItem('note-draft'); await fetchNotes() }
    }
    setIsProcessing(false)
  }

  const editNote = (note: Note) => {
    setEditingId(note.id); setNewNote(note.content); setSelectedCat(note.category); setFileUrl(note.file_url || null)
    window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => textareaRef.current?.focus(), 100)
  }

  const deleteNote = async (id: string) => {
    triggerAlert(
      "Delete Note?", 
      "This note will be gone forever! Are you sure you want to remove it from the hive?", 
      async () => {
        const { error } = await supabase.from('notes').delete().eq('id', id)
        if (!error) setNotes(notes.filter(n => n.id !== id))
        setAlert(null)
      }
    )
  }

  const toggleExpand = (id: string) => setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }))

  const filteredNotes = notes.filter(note => (note.content || '').toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="min-h-screen bg-[#FFCC33] p-4 md:p-10 font-sans selection:bg-[#78350F] selection:text-white relative overflow-x-hidden text-[#78350F]">
      
      {/* Honey Aesthetic Custom Alert */}
      {alert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#451A03]/60 backdrop-blur-sm transition-all">
          <div className="bg-white w-full max-w-sm rounded-[32px] border-4 border-[#78350F] shadow-[12px_12px_0px_0px_rgba(69,26,3,0.3)] overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-[#FEE440] p-4 border-b-4 border-[#78350F] flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl border-2 border-[#78350F] text-[#78350F]">
                <AlertTriangle size={20} fill="#FFCC33" />
              </div>
              <h3 className="font-black uppercase tracking-tight text-lg">{alert.title}</h3>
            </div>
            <div className="p-6">
              <p className="font-bold text-[#78350F] leading-relaxed text-sm mb-6">{alert.message}</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setAlert(null)} className="px-4 py-3 rounded-xl border-2 border-[#78350F] font-black uppercase text-xs hover:bg-stone-50 transition-colors">
                  Keep it
                </button>
                <button onClick={alert.onConfirm} className="px-4 py-3 rounded-xl bg-[#FF4D6D] border-2 border-[#78350F] text-white font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(120,53,15,1)] hover:translate-y-[2px] hover:shadow-none transition-all">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- BACKGROUND PATTERN --- */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dotPattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="#78350F" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dotPattern)" />
        </svg>
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-br from-yellow-200 to-transparent opacity-40 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-yellow-400 to-transparent opacity-30 blur-3xl"></div>
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
          <button onClick={() => window.location.href = '/notes'} className="flex items-center gap-4 bg-[#78350F] p-3 rounded-2xl border-4 border-[#451A03] shadow-[6px_6px_0px_0px_rgba(120,53,15,0.3)]">
            <span className="text-3xl">🐻</span>
            <h1 className="text-2xl font-black tracking-tighter text-[#FFC300] uppercase">Haim Sheli</h1>
          </button>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <input type="text" placeholder="Search notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-full border-4 border-[#78350F] outline-none bg-white shadow-[4px_4px_0px_0px_rgba(120,53,15,1)] text-sm font-bold"/>
              <Search className="absolute left-4 top-3 text-[#78350F]" size={18} />
            </div>
            <button onClick={() => { supabase.auth.signOut(); window.location.href = '/login' }} className="bg-[#FF4D6D] border-4 border-[#78350F] p-3 rounded-full">
              <LogOut className="text-white" size={20} />
            </button>
          </div>
        </header>

        <div className="max-w-xl mx-auto bg-white rounded-[32px] border-4 border-[#78350F] shadow-[10px_10px_0px_0px_rgba(120,53,15,0.15)] overflow-hidden mb-12">
          <div className="flex items-center justify-between px-5 py-2 bg-[#FEE440] border-b-4 border-[#78350F]">
            <div className="flex items-center gap-2">
              <button onClick={() => insertFormat('bold')} className="p-2 bg-white border-2 border-[#78350F] rounded-xl hover:bg-stone-50"><Bold size={16} /></button>
              <button onClick={() => insertFormat('italic')} className="p-2 bg-white border-2 border-[#78350F] rounded-xl hover:bg-stone-50"><Italic size={16} /></button>
              <button onClick={() => insertFormat('bullet')} className="p-2 bg-white border-2 border-[#78350F] rounded-xl hover:bg-stone-50"><List size={16} /></button>
              <button onClick={() => insertFormat('number')} className="p-2 bg-white border-2 border-[#78350F] rounded-xl hover:bg-stone-50"><ListOrdered size={16} /></button>
              <button onClick={() => insertFormat('strike')} className="p-2 bg-white border-2 border-[#78350F] rounded-xl hover:bg-stone-50"><Strikethrough size={16} /></button>
              <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-white border-2 border-[#78350F] rounded-xl hover:bg-stone-50"><Paperclip size={16} /></button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            </div>
            { (newNote.length > 0 || editingId) && (
              <span className="text-[10px] font-black uppercase opacity-40 animate-pulse">
                {editingId ? 'Editing Hive' : 'Draft Saved 🍯'}
              </span>
            )}
          </div>

          <div className="relative">
            <textarea 
              ref={textareaRef} 
              className="w-full px-5 py-4 min-h-[140px] focus:outline-none resize-none text-lg font-medium text-[#78350F] placeholder-stone-300 bg-white" 
              placeholder="Write a note..." 
              value={newNote} 
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={handleKeyDown} 
            />
            {(isUploading || fileUrl) && (
              <div className="px-5 pb-4">
                <div className="relative inline-block rounded-xl overflow-hidden border-2 border-[#78350F] bg-stone-100 max-w-[200px]">
                  {isUploading ? <div className="flex items-center justify-center h-24 w-40"><Loader2 className="animate-spin text-[#78350F]" size={24} /></div> : 
                  <>
                    <img src={fileUrl!} alt="Preview" className="w-full h-auto max-h-32 object-cover opacity-80" />
                    <button onClick={() => setFileUrl(null)} className="absolute top-1 right-1 bg-white border-2 border-[#78350F] rounded-full p-0.5"><X size={12} /></button>
                  </>}
                </div>
              </div>
            )}
          </div>
          
          <div className="px-5 py-3 bg-[#FFC300] flex flex-wrap gap-2 justify-between items-center border-t-4 border-[#78350F]">
            <div className="flex gap-1.5">
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCat(cat.id)} className={`flex items-center h-9 rounded-xl border-2 border-[#78350F] ${selectedCat === cat.id ? 'bg-[#78350F] text-white px-4' : 'bg-white px-2 shadow-[2px_2px_0px_0px_rgba(120,53,15,1)]'}`}>
                  <span className="text-lg">{cat.emoji}</span>
                  <span className={`text-[10px] font-black ml-1.5 ${selectedCat === cat.id ? 'block' : 'hidden'}`}>{cat.text}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {(newNote.length > 0 || editingId) && (
                <button onClick={discardNote} className="bg-white border-2 border-[#78350F] text-[#78350F] p-2 rounded-xl hover:bg-red-50 transition-colors">
                  <Trash2 size={18} />
                </button>
              )}
              <button onClick={addNote} disabled={isProcessing || isUploading} className="bg-[#78350F] text-[#FFC300] px-6 py-2 rounded-xl text-sm font-black uppercase tracking-wider">
                {isProcessing ? '...' : editingId ? 'Update' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>

        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {filteredNotes.map((note) => {
            const isExpanded = expandedNotes[note.id], catInfo = CATEGORIES.find(c => c.id === note.category) || CATEGORIES[0];
            const needsExpansion = note.content.split('\n').length > 5 || note.content.length > 150;
            return (
              <div key={note.id} className="break-inside-avoid bg-white/95 backdrop-blur-sm p-6 rounded-[32px] border-4 border-[#78350F] shadow-[8px_8px_0px_0px_rgba(120,53,15,1)] group relative">
                <div className="absolute top-4 right-4 flex gap-1.5 z-20">
                  <button onClick={() => editNote(note)} className="p-1.5 bg-white border-2 border-[#78350F] rounded-lg hover:bg-stone-50"><Pencil size={14} className="text-[#78350F]" /></button>
                  <button onClick={() => deleteNote(note.id)} className="p-1.5 bg-[#FF4D6D] border-2 border-[#78350F] text-white rounded-lg hover:bg-[#ff3355]">✕</button>
                </div>
                <div className={`inline-block px-3 py-0.5 rounded-lg border-2 border-[#78350F] text-[10px] font-black mb-4 uppercase ${catInfo.color}`}>{catInfo.emoji} {catInfo.text}</div>
                <div className={`prose prose-stone prose-base max-w-none overflow-hidden ${!isExpanded ? 'max-h-[220px]' : 'max-h-none'} font-medium text-[#78350F] leading-snug prose-p:my-0 prose-ul:my-2 prose-ol:my-2 prose-hr:border-dashed prose-hr:border-[#78350F]/30 prose-hr:my-4 prose-strong:text-[#78350F] prose-strong:font-black prose-strong:text-[1.05em] prose-del:opacity-50 prose-del:line-through prose-del:decoration-[#FF4D6D] prose-del:decoration-2 prose-h3:text-sm prose-h3:font-black prose-h3:mt-4 prose-h3:mb-2 prose-h3:uppercase`}>
                  <Markdown remarkPlugins={[remarkGfm]}>{note.content}</Markdown>
                </div>
                {needsExpansion && <button onClick={() => toggleExpand(note.id)} className="text-[10px] font-black uppercase mt-3 py-1.5 px-3 bg-[#FEE440] border-2 border-[#78350F] rounded-xl hover:bg-white transition-all shadow-[2px_2px_0px_0px_rgba(120,53,15,1)]">{isExpanded ? 'Show Less' : 'See Full Note 🍯'}</button>}
                {note.file_url && <div className="mt-4 rounded-xl overflow-hidden border-2 border-[#78350F]">{note.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? <img src={note.file_url} alt="attachment" className="w-full h-auto" /> : <a href={note.file_url} target="_blank" rel="noreferrer" className="block p-3 bg-[#FEE440] text-[10px] font-black text-center uppercase">View Document 📎</a>}</div>}
                <div className="mt-6 pt-4 border-t-2 border-[#78350F] flex justify-between items-center italic"><span className="text-[9px] font-black uppercase opacity-60 tracking-widest">{new Date(note.created_at).toLocaleDateString()}</span><span className="text-xl">🍯</span></div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}