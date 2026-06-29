import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type Page = 'home' | 'input' | 'chat' | 'finish' | 'result'

const worries = [
  '내일 발표 어떡하지', '과제 아직 못 했는데 어떡해', '답장 늦게 하면 싫어할까',
  '내가 한 말 이상했나', '이번에도 실수하면 어떡하지', '왜 나만 뒤처지는 것 같지',
  '월요일이 또 오고 있어', '아무것도 안 했는데 벌써 피곤해',
]

const backgroundWorries = Array.from({ length: 48 }, (_, index) => ({
  text: worries[index % worries.length],
  x: (index * 37 + 3) % 94,
  y: (index * 53 + 4) % 92,
  size: 13 + (index % 4) * 2,
  duration: 11 + (index % 8),
}))

const questions = [
  {
    line: '에휴... 그 생각이 계속 머릿속을 맴돌고 있구나.',
    question: '만약 생각한 것보다 훨씬 안 좋은 일이 생기면 어떡해?',
    choices: ['그래도 어떻게든 수습할 수 있을 것 같아', '상상만 해도 너무 무서워', '사실 그렇게까지 될 가능성은 낮아'],
  },
  {
    line: '하이고... 그럴 수도 있지. 그런데 말이야...',
    question: '그 일이 생기면 주변 사람들도 너를 이상하게 볼까?',
    choices: ['잠깐은 그럴 수도 있겠지', '아무도 나만큼 신경 쓰진 않을 거야', '그래도 한 명쯤은 내 편일 거야'],
  },
  {
    line: '어떡해... 생각할수록 경우의 수가 늘어나네.',
    question: '혹시 지금 놓치고 있는 위험이 또 있지는 않을까?',
    choices: ['이제 그만 생각해도 될 것 같아', '하나만 더 떠올려 볼래', '내가 통제할 수 있는 것부터 할래'],
  },
  {
    line: '그렇구나... 그런데 그 걱정이 정말 네 잘못이면 어떡해?',
    question: '다음에도 같은 실수를 반복하게 되지는 않을까?',
    choices: ['다음엔 다르게 해볼 수 있어', '실수는 누구나 해', '아직 일어나지도 않은 일이야'],
  },
  {
    line: '에휴... 여기까지 생각하느라 고생했어.',
    question: '이 걱정을 오늘 하루 종일 더 붙잡고 있어야 할까?',
    choices: ['이제 놓아줘도 될 것 같아', '딱 10분만 걱정하고 끝낼래', '할 수 있는 작은 행동 하나만 할래'],
  },
]

const voiceUrls = [
  new URL('../voice/Take1-1_어떡해_2026-06-29.wav', import.meta.url).href,
  new URL('../voice/Take2-1_에휴~_2026-06-29.wav', import.meta.url).href,
  new URL('../voice/Take3-1_하이고_2026-06-29.wav', import.meta.url).href,
]

function App() {
  const [page, setPage] = useState<Page>('home')
  const [worry, setWorry] = useState('')
  const [draft, setDraft] = useState('')
  const [round, setRound] = useState(0)
  const [showEscape, setShowEscape] = useState(false)
  const [audioStarted, setAudioStarted] = useState(false)
  const [buttonPos, setButtonPos] = useState({ x: 91, y: 8 })
  const [discarded, setDiscarded] = useState<string[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const audioIndexRef = useRef(0)

  const pieces = useMemo(() => worry.trim().split(/\s+/).filter(Boolean), [worry])
  const remaining = pieces.filter((_, index) => !discarded.includes(`${index}`))
  const damage = page === 'chat' ? round + 1 : 0
  const question = questions[round % questions.length]

  const navigate = (next: Page) => {
    setPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    if (page !== 'chat') return
    setShowEscape(false)
    const timer = window.setTimeout(() => setShowEscape(true), 3000)
    return () => window.clearTimeout(timer)
  }, [page, round])

  useEffect(() => {
    if (!audioStarted) {
      audioRef.current?.pause()
      audioRef.current = null
      if (timerRef.current) window.clearTimeout(timerRef.current)
      return
    }

    const audio = audioRef.current ?? new Audio()
    audioRef.current = audio
    audio.volume = 0.34
    audio.preload = 'auto'

    const queueNext = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        audioIndexRef.current = (audioIndexRef.current + 1) % voiceUrls.length
        audio.src = voiceUrls[audioIndexRef.current]
        audio.load()
        audio.play().catch(() => queueNext())
      }, 2000)
    }

    const handleEnded = () => queueNext()
    const handleError = () => queueNext()

    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    if (!audio.src) {
      audio.src = voiceUrls[audioIndexRef.current]
      audio.load()
    }

    audio.play().catch(() => queueNext())

    return () => {
      audio.pause()
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [audioStarted])

  const beginAudio = () => setAudioStarted(true)
  const choose = () => {
    setRound((old) => old + 1)
  }
  const moveBgmButton = () => setButtonPos({ x: 8 + Math.random() * 84, y: 7 + Math.random() * 86 })
  const reset = () => {
    setWorry(''); setDraft(''); setRound(0); setDiscarded([]); navigate('input')
  }
  const downloadResult = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1200; canvas.height = 1400
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const grad = ctx.createLinearGradient(0, 0, 1200, 1400)
    grad.addColorStop(0, '#f2eadc'); grad.addColorStop(1, '#d6c7b0')
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 1200, 1400)
    ctx.strokeStyle = '#5c4b3d'; ctx.lineWidth = 5; ctx.strokeRect(70, 70, 1060, 1260)
    ctx.textAlign = 'center'; ctx.fillStyle = '#332922'
    ctx.font = '700 72px sans-serif'; ctx.fillText('하이고', 600, 230)
    ctx.font = '160px sans-serif'; ctx.fillText('🧸', 600, 520)
    ctx.font = '700 52px sans-serif'; ctx.fillText('걱정인형 입양 완료', 600, 650)
    ctx.font = '36px sans-serif'; ctx.fillText('이 인형은 당신 대신', 600, 750)
    ctx.fillText('“어떡해...”를 중얼거립니다.', 600, 805)
    ctx.font = '28px sans-serif'
    const summary = worry.length > 34 ? `${worry.slice(0, 34)}…` : worry
    ctx.fillText(`버린 걱정: ${summary}`, 600, 980)
    ctx.fillText(new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long' }).format(new Date()), 600, 1120)
    const link = document.createElement('a')
    link.download = '하이고-걱정인형.png'; link.href = canvas.toDataURL('image/png'); link.click()
  }

  return (
    <main className={`app page-${page} damage-stage-${Math.min(damage, 12)}`} onClick={beginAudio}>
      <div className="noise" aria-hidden="true" />
      <div className="floating-worries" aria-hidden="true">
        {backgroundWorries.map((item, index) => <span key={`${item.text}-${index}`} style={{ '--x': `${item.x}%`, '--y': `${item.y}%`, '--size': `${item.size}px`, '--duration': `${item.duration}s` } as React.CSSProperties}>{item.text}</span>)}
      </div>
      <button
        className="bgm-button"
        style={{ left: `${buttonPos.x}%`, top: `${buttonPos.y}%` }}
        onPointerEnter={moveBgmButton}
        onPointerDown={(event) => { event.preventDefault(); moveBgmButton() }}
        onFocus={(event) => { event.currentTarget.blur(); moveBgmButton() }}
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); moveBgmButton() }}
      >BGM 끄기</button>

      <section className="stage" key={`${page}-${round}`}>
        {page === 'home' && <>
          <div className="doll large" aria-hidden="true"><span>🧸</span><i>어떡해...</i></div>
          <p className="eyebrow">걱정 무한 증폭 서비스</p>
          <h1>하이고</h1>
          <p className="lead">고민을 해결해주는 척하다가<br />더 걱정하게 만드는 AI 걱정인형</p>
          <button className="primary" onClick={() => navigate('input')}>내 고민 들어줘</button>
        </>}

        {page === 'input' && <>
          <div className="doll"><span>🧸</span><i>무슨 일인데...</i></div>
          <p className="eyebrow">일단 말해봐</p>
          <h2>요즘 뭐가 제일 걱정돼?</h2>
          <textarea autoFocus value={draft} maxLength={160} onChange={(e) => setDraft(e.target.value)} placeholder="고민을 입력하세요... 해결은 못 해드립니다" />
          <div className="input-meta"><span>{draft.length}/160</span></div>
          <button className="primary" disabled={!draft.trim()} onClick={() => { setWorry(draft.trim()); navigate('chat') }}>고민 맡기기</button>
        </>}

        {page === 'chat' && <div className="chat-card">
          <div className="progress"><span /><b>{round + 1}번째 걱정</b></div>
          <div className="doll"><span>{damage > 8 ? '🫥' : damage > 3 ? '🫠' : damage > 1 ? '😰' : '🧸'}</span><i>{question.line}</i></div>
          <p className="your-worry">“{worry}”</p>
          <h2>{question.question}</h2>
          <div className="choices">
            {question.choices.map((choice) => <button key={choice} onClick={choose}>{choice}</button>)}
          </div>
        </div>}

        {page === 'finish' && <>
          <p className="eyebrow">아직도 그게 고민이야?</p>
          <h2>말로 했으면 이제 버려.</h2>
          <p className="lead small">단어 조각을 쓰레기통으로 끌어다 놓거나 눌러주세요.</p>
          <div className="word-pieces">
            {pieces.map((piece, index) => !discarded.includes(`${index}`) && <button key={`${piece}-${index}`} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', `${index}`)} onClick={() => setDiscarded((old) => [...old, `${index}`])}>{piece}</button>)}
          </div>
          <div className={`trash ${remaining.length === 0 ? 'full' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => setDiscarded((old) => [...new Set([...old, e.dataTransfer.getData('text/plain')])])}>
            <span>{remaining.length === 0 ? '✨' : '🗑️'}</span><b>{remaining.length === 0 ? '다 버렸다' : '여기로 버리기'}</b>
          </div>
          {remaining.length === 0 && <div className="final-actions"><button className="secondary" onClick={reset}>다시 하기</button><button className="primary" onClick={() => navigate('result')}>결과 보기</button></div>}
        </>}

        {page === 'result' && <>
          <div className="result-card">
            <p className="eyebrow">하이고</p><div className="result-doll">🧸</div>
            <h2>걱정인형 입양 완료</h2>
            <p>이 인형은 당신 대신<br /><b>“어떡해...”</b>를 중얼거립니다.</p>
            <div className="summary">버린 걱정<br /><strong>{worry}</strong></div>
            <time>{new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long' }).format(new Date())}</time>
          </div>
          <div className="final-actions"><button className="secondary" onClick={reset}>다시 하기</button><button className="primary" onClick={downloadResult}>결과 이미지 저장</button></div>
        </>}
      </section>
      {page === 'chat' && showEscape && <button className="escape escape-safe" onClick={() => navigate('finish')}>응... 그런가?</button>}
      {!audioStarted && <p className="audio-hint">화면을 누르면 걱정인형의 한숨이 시작됩니다</p>}
    </main>
  )
}

export default App
