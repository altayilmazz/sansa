import { useEffect } from 'react'
import { translate, type Lang } from '../state/i18n'

const ATTRS = ['aria-label', 'title', 'placeholder'] as const

/**
 * Dil İngilizce iken ekrandaki Türkçe metinleri (metin düğümleri, aria-label,
 * title, placeholder, sayfa başlığı) tablodaki İngilizcesiyle değiştirir ve
 * değişiklikleri izler. Türkçe'ye dönünce özgün metinler geri yazılır.
 */
export function Translator({ lang }: { lang: Lang }) {
  useEffect(() => {
    document.documentElement.lang = lang
    if (lang === 'tr') return

    const textOrig = new WeakMap<Text, string>()
    const textNow = new WeakMap<Text, string>()
    const attrOrig = new WeakMap<Element, Record<string, string>>()
    const touched = new Set<Text>()
    const touchedEls = new Set<Element>()

    const doText = (n: Text) => {
      const cur = n.nodeValue ?? ''
      if (textNow.get(n) === cur) return // kendi çevirimiz
      const en = translate(cur)
      if (en && en !== cur) {
        textOrig.set(n, cur)
        textNow.set(n, en)
        touched.add(n)
        n.nodeValue = en
      }
    }
    const doEl = (el: Element) => {
      for (const a of ATTRS) {
        const v = el.getAttribute(a)
        if (!v) continue
        const rec = attrOrig.get(el)
        if (rec && rec[`now:${a}`] === v) continue
        const en = translate(v)
        if (en && en !== v) {
          const r = rec ?? {}
          r[a] = v
          r[`now:${a}`] = en
          attrOrig.set(el, r)
          touchedEls.add(el)
          el.setAttribute(a, en)
        }
      }
    }
    const walk = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) {
        doText(root as Text)
        return
      }
      if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return
      if (root.nodeType === Node.ELEMENT_NODE) doEl(root as Element)
      const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
      let n = tw.nextNode()
      while (n) {
        if (n.nodeType === Node.TEXT_NODE) {
          const p = n.parentElement
          if (!p || (p.tagName !== 'SCRIPT' && p.tagName !== 'STYLE')) doText(n as Text)
        } else doEl(n as Element)
        n = tw.nextNode()
      }
    }

    walk(document.documentElement)
    const mo = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === 'childList') m.addedNodes.forEach((n) => walk(n))
        else if (m.type === 'characterData') doText(m.target as Text)
        else if (m.type === 'attributes') doEl(m.target as Element)
      }
    })
    mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] })

    return () => {
      mo.disconnect()
      touched.forEach((n) => {
        const o = textOrig.get(n)
        if (o !== undefined && n.nodeValue === textNow.get(n)) n.nodeValue = o
      })
      touchedEls.forEach((el) => {
        const r = attrOrig.get(el)
        if (!r) return
        for (const a of ATTRS) if (r[a] !== undefined && el.getAttribute(a) === r[`now:${a}`]) el.setAttribute(a, r[a])
      })
    }
  }, [lang])

  return null
}
