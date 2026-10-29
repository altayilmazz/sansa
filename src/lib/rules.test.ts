import { describe, expect, it } from 'vitest'
import { cryptoInt, sample, shuffle, type Rng } from './random'
import { addNames, duplicateKeys, parseNames } from './entries'
import { makeTeams, planTeams } from './rules/teams'
import { indexAtPointer, planSpin } from './rules/wheel'
import { checkDraw, drawWinners, nextPool } from './rules/draw'
import { addRound, matchWinner } from './rules/match'
import { coinOutcome } from './rules/coin'
import { diceOutcome, rollDice } from './rules/dice'
import { clampMines, maxMines, newGame, reveal, safeLeft } from './rules/mines'
import { checkRange, generate } from './rules/number'
import { legalMoves, perft, playRandomGame, START } from './rules/chess'
import { MAX_HORSES, planRace } from './rules/race'
import { load, pull } from './rules/roulette'
import { cardOutcome, Deck, fullDeck, type Card } from './rules/cards'

/** Verilen değerleri sırayla döndüren deterministik kaynak. */
const seq = (values: number[]): Rng => {
  let i = 0
  return { int: (max) => values[i++ % values.length] % max }
}

describe('rastgelelik', () => {
  it('cryptoInt sınırlar içinde kalır ve tüm değerleri üretir', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) {
      const v = cryptoInt(7)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(7)
      seen.add(v)
    }
    expect(seen.size).toBe(7)
  })

  it('geçersiz üst sınırı reddeder', () => {
    expect(() => cryptoInt(0)).toThrow()
    expect(() => cryptoInt(2.5)).toThrow()
  })

  it('cryptoInt yaklaşık eşit dağılır (ki-kare)', () => {
    const n = 6
    const N = 60000
    const counts = new Array(n).fill(0)
    for (let i = 0; i < N; i++) counts[cryptoInt(n)]++
    const exp = N / n
    const chi = counts.reduce((s, c) => s + (c - exp) ** 2 / exp, 0)
    // 5 serbestlik derecesi, p=0.001 eşiği ≈ 20.5
    expect(chi).toBeLessThan(20.5)
  })

  it('Fisher–Yates permütasyonları eşit sıklıkta üretir', () => {
    const counts = new Map<string, number>()
    const N = 36000
    for (let i = 0; i < N; i++) {
      const k = shuffle([1, 2, 3]).join('')
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    expect(counts.size).toBe(6)
    const exp = N / 6
    const chi = [...counts.values()].reduce((s, c) => s + (c - exp) ** 2 / exp, 0)
    expect(chi).toBeLessThan(20.5)
  })

  it('shuffle girdiyi değiştirmez, aynı öğeleri korur', () => {
    const src = [1, 2, 3, 4, 5]
    const out = shuffle(src)
    expect(src).toEqual([1, 2, 3, 4, 5])
    expect([...out].sort()).toEqual(src)
  })

  it('sample tekrarsızdır ve fazla seçimi reddeder', () => {
    for (let i = 0; i < 200; i++) {
      const s = sample([1, 2, 3, 4, 5], 3)
      expect(new Set(s).size).toBe(3)
    }
    expect(() => sample([1, 2], 3)).toThrow()
  })
})

describe('girdi temizleme', () => {
  it('satır ve virgülle ayrılmış isimleri ayırır, boşlukları atar', () => {
    expect(parseNames('Ali, Veli\n\n  Ayşe   Nur ,  ,\n   ')).toEqual(['Ali', 'Veli', 'Ayşe Nur'])
  })
  it('aynı isimleri silmez, bildirir', () => {
    const r1 = addNames([], 'Ali, Veli')
    const r2 = addNames(r1.entries, 'ali, İrem')
    expect(r2.entries).toHaveLength(4)
    expect(r2.duplicates).toEqual(['ali'])
    expect(duplicateKeys(r2.entries).has('ali')).toBe(true)
  })
})

describe('takımlar', () => {
  const ten = Array.from({ length: 10 }, (_, i) => `K${i + 1}`)

  it('10 kişi, 2 takım: iki adet 5 kişilik takım, herkes tam bir kez', () => {
    for (let r = 0; r < 100; r++) {
      const teams = makeTeams(ten, 2)
      expect(teams.map((t) => t.length)).toEqual([5, 5])
      const all = teams.flat()
      expect(all).toHaveLength(10)
      expect(new Set(all).size).toBe(10)
      expect([...all].sort()).toEqual([...ten].sort())
    }
  })

  it('eşit olmayan dağılımda fark en fazla birdir ve önceden açıklanır', () => {
    const plan = planTeams(11, 3)
    expect(plan.ok).toBe(true)
    expect(plan.even).toBe(false)
    expect(plan.note).toContain('2 takım 4, 1 takım 3')
    const teams = makeTeams(ten.concat('K11'), 3)
    const sizes = teams.map((t) => t.length)
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
    expect(sizes.reduce((a, b) => a + b)).toBe(11)
  })

  it('yetersiz kişi ve geçersiz takım sayısını reddeder', () => {
    expect(planTeams(1, 2).ok).toBe(false)
    expect(planTeams(10, 1).ok).toBe(false)
    expect(planTeams(10, 9).ok).toBe(false)
    expect(() => makeTeams(['a'], 2)).toThrow()
  })

  it('her kişinin her takıma düşme olasılığı yaklaşık eşittir', () => {
    const N = 20000
    let inFirst = 0
    for (let i = 0; i < N; i++) if (makeTeams(ten, 2)[0].includes('K1')) inFirst++
    expect(Math.abs(inFirst / N - 0.5)).toBeLessThan(0.02)
  })
})

describe('çark', () => {
  it('hedef açıda işaretçi her zaman seçilen dilimi gösterir', () => {
    for (let n = 2; n <= 24; n++) {
      let current = 0
      for (let r = 0; r < 200; r++) {
        const { index, target } = planSpin(current, n)
        expect(indexAtPointer(target, n)).toBe(index)
        expect(target).toBeGreaterThan(current + 360 * 4)
        current = target
      }
    }
  })

  it('kenar sapmasında bile doğru dilimde durur', () => {
    // fraction 0 ve neredeyse 1 uçları
    const lo = planSpin(0, 8, seq([3, 0]))
    expect(lo.index).toBe(3)
    expect(indexAtPointer(lo.target, 8)).toBe(3)
    const hi = planSpin(123.4, 8, seq([5, 0xffffffff]))
    expect(hi.index).toBe(5)
    expect(indexAtPointer(hi.target, 8)).toBe(5)
  })

  it('seçenekler eşit olasılıklıdır', () => {
    const n = 5
    const N = 25000
    const c = new Array(n).fill(0)
    for (let i = 0; i < N; i++) c[planSpin(0, n).index]++
    const exp = N / n
    const chi = c.reduce((s, x) => s + (x - exp) ** 2 / exp, 0)
    expect(chi).toBeLessThan(18.5) // 4 sd, p=0.001
  })

  it('ikiden az seçenekte çevirmez', () => {
    expect(() => planSpin(0, 1)).toThrow()
  })
})

describe('kura', () => {
  const pool = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: id.toUpperCase() }))

  it('tek çekilişte aynı kayıt iki kez seçilmez', () => {
    for (let i = 0; i < 300; i++) {
      const w = drawWinners(pool, 4)
      expect(new Set(w.map((x) => x.id)).size).toBe(4)
    }
  })

  it('listeden fazla kazanan seçmeyi engeller', () => {
    expect(checkDraw(5, 6).ok).toBe(false)
    expect(checkDraw(0, 1).ok).toBe(false)
    expect(checkDraw(5, 0).ok).toBe(false)
    expect(() => drawWinners(pool, 6)).toThrow()
  })

  it('tekrarsız modda kazananlar sonraki turdan çıkar, tekrarlı modda kalır', () => {
    const w = [pool[1], pool[3]]
    expect(nextPool(pool, w, 'tekrarsiz').map((p) => p.id)).toEqual(['a', 'c', 'e'])
    expect(nextPool(pool, w, 'tekrarli')).toHaveLength(5)
  })
})

describe('karşılaşmalar', () => {
  it('üçte iki: ilk iki galibiyete ulaşan kazanır, beraberlik sayılmaz', () => {
    let s = { a: 0, b: 0 }
    s = addRound(s, 'a')
    expect(matchWinner(s, 'ucte-iki')).toBeNull()
    expect(matchWinner(s, 'tek')).toBe('a')
    s = addRound(s, 'berabere')
    s = addRound(s, 'b')
    expect(matchWinner(s, 'ucte-iki')).toBeNull()
    s = addRound(s, 'b')
    expect(matchWinner(s, 'ucte-iki')).toBe('b')
  })

  it('yazı tura sonucu seçilen tarafa göre belirlenir', () => {
    expect(coinOutcome('yazi', 'yazi')).toBe('a')
    expect(coinOutcome('tura', 'yazi')).toBe('b')
    expect(coinOutcome('tura', 'tura')).toBe('a')
  })

  it('zar: değerler 1–6, yüksek toplam kazanır, eşitlik beraberlik', () => {
    for (let i = 0; i < 500; i++) {
      for (const v of rollDice(2)) {
        expect(v).toBeGreaterThanOrEqual(1)
        expect(v).toBeLessThanOrEqual(6)
      }
    }
    expect(diceOutcome([6, 1], [3, 3])).toBe('a')
    expect(diceOutcome([2, 2], [1, 3])).toBe('berabere')
    expect(diceOutcome([1], [2])).toBe('b')
    expect(() => diceOutcome([1, 2], [3])).toThrow()
    expect(() => rollDice(3)).toThrow()
  })
})

describe('kart destesi', () => {
  it('52 benzersiz kart, joker yok', () => {
    const d = fullDeck()
    expect(d).toHaveLength(52)
    expect(new Set(d.map((c) => c.id)).size).toBe(52)
    expect(d.every((c) => c.rank >= 2 && c.rank <= 14)).toBe(true)
  })

  it('aynı destede kartlar tekrar etmez; sıfırlanınca 52 kart döner', () => {
    const deck = new Deck()
    const drawn = new Set<string>()
    for (let i = 0; i < 52; i++) {
      const c = i % 2 ? deck.draw() : deck.drawAt(Math.min(3, deck.remaining - 1))
      expect(drawn.has(c.id)).toBe(false)
      drawn.add(c.id)
    }
    expect(deck.remaining).toBe(0)
    expect(() => deck.draw()).toThrow()
    deck.reset()
    expect(deck.remaining).toBe(52)
  })

  it('karıştırma kalan kartları korur', () => {
    const deck = new Deck()
    deck.draw()
    deck.draw()
    const before = deck.snapshot().map((c) => c.id).sort()
    deck.shuffle()
    expect(deck.snapshot().map((c) => c.id).sort()).toEqual(before)
  })

  it('As en yüksek; türler eşit; aynı değer beraberlik', () => {
    const c = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit, id: `${suit}-${rank}` })
    expect(cardOutcome(c(14, 'sinek'), c(13, 'maca'))).toBe('a')
    expect(cardOutcome(c(2, 'maca'), c(3, 'sinek'))).toBe('b')
    expect(cardOutcome(c(10, 'kupa'), c(10, 'maca'))).toBe('berabere')
  })
})

describe('mayın tarlası', () => {
  it('mayın sayısı tam olarak istenen kadardır ve her boyutta en az bir güvenli kare kalır', () => {
    for (let size = 2; size <= 6; size++) {
      const g = newGame(size, 3)
      expect(g.cells.length).toBe(size * size)
      expect(g.cells.filter((c) => c.mine).length).toBe(Math.min(3, maxMines(size)))
    }
    expect(clampMines(2, 99)).toBe(3)
    expect(clampMines(3, 0)).toBe(1)
  })
  it('mayınlar tüm karelere eşit dağılır', () => {
    const hits = new Array(9).fill(0)
    for (let k = 0; k < 900; k++) newGame(3, 1).cells.forEach((c, i) => c.mine && hits[i]++)
    hits.forEach((h) => {
      expect(h).toBeGreaterThan(50)
      expect(h).toBeLessThan(160)
    })
  })
  it('mayına basmak oyunu bitirir ve mayınları gösterir', () => {
    const g = newGame(3, 2)
    const mine = g.cells.findIndex((c) => c.mine)
    const end = reveal(g, mine)
    expect(end.state).toBe('boom')
    expect(end.boom).toBe(mine)
    expect(end.cells.filter((c) => c.mine).every((c) => c.open)).toBe(true)
    expect(reveal(end, 0)).toBe(end)
  })
  it('tüm güvenli kareler açılınca oyun temiz biter', () => {
    let g = newGame(3, 2)
    g.cells.forEach((c, i) => {
      if (!c.mine && g.state === 'play') g = reveal(g, i)
    })
    expect(g.state).toBe('clear')
    expect(safeLeft(g)).toBe(0)
  })
})

describe('rastgele sayı', () => {
  it('aralık içinde kalır ve uçları üretir', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 400; i++) generate(3, 6, 1, false).forEach((v) => seen.add(v))
    expect([...seen].sort()).toEqual([3, 4, 5, 6])
  })
  it('tekrarsız üretimde tekrar yoktur', () => {
    const out = generate(1, 10, 10, true)
    expect(new Set(out).size).toBe(10)
    expect(generate(1, 1_000_000, 20, true).length).toBe(20)
  })
  it('geçersiz girdileri reddeder', () => {
    expect(checkRange(5, 1, 1, false).ok).toBe(false)
    expect(checkRange(1, 3, 4, true).ok).toBe(false)
    expect(checkRange(1.5, 3, 1, false).ok).toBe(false)
    expect(checkRange(1, 3, 3, true).ok).toBe(true)
  })
})

describe('satranç', () => {
  it('başlangıç konumunda hamle sayıları doğrudur (perft 1-3)', () => {
    expect(perft(START, 'w', 1)).toBe(20)
    expect(perft(START, 'w', 2)).toBe(400)
    expect(perft(START, 'w', 3)).toBe(8902)
  })
  it('rastgele oyun yasal hamlelerle ilerler ve sonuçlanır', () => {
    const g = playRandomGame()
    expect(g.boards.length).toBe(g.moves.length + 1)
    g.moves.forEach((m, i) => {
      const turn = i % 2 === 0 ? 'w' : 'b'
      expect(legalMoves(g.boards[i], turn).some((x) => x.from === m.from && x.to === m.to)).toBe(true)
    })
    expect(['w', 'b', 'draw']).toContain(g.result)
  })
})

describe('at yarışı', () => {
  it('bitiş sırası ve süreler tutarlıdır', () => {
    for (let n = 3; n <= MAX_HORSES; n++) {
      const p = planRace(n)
      expect(new Set(p.order).size).toBe(n)
      for (let r = 1; r < n; r++) expect(p.durations[p.order[r]]).toBeGreaterThan(p.durations[p.order[r - 1]])
      p.paths.forEach((path) => {
        expect(path.x[0]).toBe(0)
        expect(path.x[path.x.length - 1]).toBe(1)
        for (let i = 1; i < path.x.length; i++) {
          expect(path.x[i]).toBeGreaterThan(path.x[i - 1])
          expect(path.times[i]).toBeGreaterThan(path.times[i - 1])
        }
      })
    }
  })
  it('her at kazanma şansı eşittir', () => {
    const wins = new Array(4).fill(0)
    for (let i = 0; i < 2000; i++) wins[planRace(4).order[0]]++
    wins.forEach((w) => {
      expect(w).toBeGreaterThan(380)
      expect(w).toBeLessThan(620)
    })
  })
})

describe('rus ruleti', () => {
  it('mermi sayısı doğrudur ve mermili yuvada oyun biter', () => {
    for (let b = 1; b <= 5; b++) expect(load(b).chambers.filter(Boolean).length).toBe(b)
    let g = load(1)
    let guard = 0
    while (g.state === 'play' && guard++ < 10) g = pull(g)
    expect(g.state).toBe('bang')
    expect(g.pulls).toBeLessThanOrEqual(6)
    expect(pull(g)).toBe(g)
  })
})
