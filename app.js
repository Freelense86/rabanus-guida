(function () {
  const CFG = window.GUIDA_CONFIG || {};
  const STR = window.GUIDA_LINGUE;
  const ICO = window.GUIDA_ICONE;
  const app = document.getElementById('app');
  let dati = null;
  let lingua = 'it';
  let offline = false;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icona = (nome, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[nome] || ICO.info}</svg>`;

  // ---------- testi ----------

  // testo dell'interfaccia nella lingua scelta
  const s = chiave => (STR[lingua] && STR[lingua][chiave]) || STR.en[chiave];
  // contenuto {it:…, en:…} nella lingua scelta, altrimenti inglese, altrimenti italiano
  const t = o => (o && (o[lingua] || o.en || o.it || Object.values(o)[0])) || '';

  // Testo scritto nel foglio → HTML: righe vuote = paragrafi, righe con «- » = elenco,
  // **parola** = grassetto, indirizzi web ed email diventano link.
  function formatta(testo) {
    const riga = r => esc(r)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/([\w.+-]+@[\w-]+\.[\w.]+)/g, '<a href="mailto:$1">$1</a>');
    return String(testo || '').split(/\n\s*\n/).map(blocco => {
      const righe = blocco.split('\n').map(r => r.trim()).filter(Boolean);
      if (!righe.length) return '';
      if (righe.every(r => /^[-•]\s/.test(r))) return '<ul>' + righe.map(r => `<li>${riga(r.replace(/^[-•]\s*/, ''))}</li>`).join('') + '</ul>';
      return '<p>' + righe.map(riga).join('<br>') + '</p>';
    }).join('');
  }

  // ---------- dati dal foglio Google ----------

  function leggiCSV(testo) {
    const righe = []; let riga = [], campo = '', virgolette = false;
    for (let i = 0; i < testo.length; i++) {
      const c = testo[i];
      if (virgolette) {
        if (c === '"') { if (testo[i + 1] === '"') { campo += '"'; i++; } else virgolette = false; }
        else campo += c;
      } else if (c === '"') virgolette = true;
      else if (c === ',') { riga.push(campo); campo = ''; }
      else if (c === '\n') { riga.push(campo); righe.push(riga); riga = []; campo = ''; }
      else if (c !== '\r') campo += c;
    }
    if (campo || riga.length) { riga.push(campo); righe.push(riga); }
    return righe;
  }

  function tabella(csv) {
    const righe = leggiCSV(csv).filter(r => r.some(v => v.trim()));
    const intestazioni = (righe.shift() || []).map(h => h.trim().toLowerCase());
    return righe.map(r => Object.fromEntries(intestazioni.map((h, i) => [h, (r[i] || '').trim()])));
  }

  // colonne titolo_it, titolo_en… → {it:…, en:…}, scartando le traduzioni non ancora pronte
  function perLingua(riga, campo) {
    const out = {};
    for (const k in riga) {
      const m = k.match(new RegExp('^' + campo + '_([a-z]{2})$'));
      if (m && riga[k] && !/^(#|loading|caricamento)/i.test(riga[k])) out[m[1]] = riga[k];
    }
    return out;
  }

  async function daFoglio(id) {
    const url = foglio => `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(foglio)}`;
    const [imp, sez, luo] = await Promise.all(['Impostazioni', 'Sezioni', 'Luoghi'].map(f =>
      fetch(url(f), { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(f + ': ' + r.status); return r.text(); })));
    const impostazioni = {};
    tabella(imp).forEach(r => { if (r.chiave) impostazioni[r.chiave.toLowerCase()] = r.valore; });
    return {
      impostazioni,
      sezioni: tabella(sez).map(r => ({
        id: r.id, ordine: r.ordine, visibile: r.visibile, icona: r.icona,
        titolo: perLingua(r, 'titolo'), testo: perLingua(r, 'testo')
      })),
      luoghi: tabella(luo).map(r => ({
        sezione: r.sezione, nome: r.nome, testo: perLingua(r, 'testo'),
        indirizzo: r.indirizzo, mappa: r.mappa, telefono: r.telefono, sito: r.sito
      }))
    };
  }

  function sistema(d) {
    d.sezioni = d.sezioni
      .filter(x => x.id && !/^(no|n|0|false)$/i.test(x.visibile || ''))
      .sort((a, b) => (+a.ordine || 999) - (+b.ordine || 999));
    d.luoghi = (d.luoghi || []).filter(l => l.nome);
    // lingue: quelle indicate in Impostazioni, altrimenti quelle che hanno almeno un titolo
    const presenti = new Set(d.sezioni.flatMap(x => Object.keys(x.titolo)));
    const scelte = (d.impostazioni.lingue || '').toLowerCase().split(/[\s,;]+/).filter(Boolean);
    d.lingue = Object.keys(STR).filter(l => scelte.length ? scelte.includes(l) : presenti.has(l));
    if (!d.lingue.length) d.lingue = ['it'];
    return d;
  }

  async function carica() {
    try {
      const d = CFG.foglio ? await daFoglio(CFG.foglio) : await fetch('esempio.json', { cache: 'no-store' }).then(r => r.json());
      try { localStorage.setItem('guida-dati', JSON.stringify(d)); } catch (e) { }
      return sistema(d);
    } catch (e) {
      console.warn('Contenuti non scaricati', e);
      let salvati = null;
      try { salvati = JSON.parse(localStorage.getItem('guida-dati')); } catch (e2) { }
      if (!salvati) throw e;
      offline = true;
      return sistema(salvati);
    }
  }

  // ---------- stile scelto in Impostazioni ----------

  const COLORI = {
    colore_sfondo: '--fondo', colore_schede: '--carta', colore_bordi: '--bordo',
    colore_titoli: '--verde', colore_testo: '--testo', colore_icone: '--accento', colore: '--accento'
  };
  const FORME = {
    pillola: { '--raggio': '999px', '--raggio-schede': '22px', '--raggio-bollo': '50%' },
    arrotondata: { '--raggio': '14px', '--raggio-schede': '16px', '--raggio-bollo': '14px' },
    squadrata: { '--raggio': '3px', '--raggio-schede': '4px', '--raggio-bollo': '4px' }
  };

  // carica un font da Google Fonts; se non ha i pesi 400/700 riprova con quello base
  function caricaFont(nome) {
    const base = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(nome).replace(/%20/g, '+');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = base + ':wght@400;700&display=swap';
    link.onerror = () => { link.onerror = null; link.href = base + '&display=swap'; };
    document.head.appendChild(link);
  }

  function applicaStile(i) {
    const root = document.documentElement.style;
    for (const k in COLORI) if (/^#[0-9a-f]{3,8}$/i.test(i[k] || '')) root.setProperty(COLORI[k], i[k]);
    const forma = FORME[(i.forma || '').toLowerCase()];
    if (forma) for (const k in forma) root.setProperty(k, forma[k]);
    const riserva = ', system-ui, -apple-system, "Segoe UI", sans-serif';
    const caricati = new Set(['Plus Jakarta Sans']);
    [['font_titoli', '--font-titoli'], ['font_testo', '--font-testo']].forEach(([k, v]) => {
      const nome = (i[k] || '').replace(/["<>;]/g, '').trim();
      if (!nome) return;
      if (!caricati.has(nome)) { caricaFont(nome); caricati.add(nome); }
      root.setProperty(v, `"${nome}"${riserva}`);
    });
    if (i.colonne === '1') document.body.classList.add('una-colonna');
    if (i.colore_sfondo) document.querySelector('meta[name=theme-color]').content = i.colore_sfondo;
  }

  // ---------- lingua ----------

  function scegliLinguaIniziale() {
    const daLink = new URLSearchParams(location.search).get('lang');
    let salvata = null;
    try { salvata = localStorage.getItem('guida-lingua'); } catch (e) { }
    const browser = (navigator.languages || [navigator.language]).map(l => (l || '').slice(0, 2).toLowerCase());
    return [daLink, salvata, ...browser, 'en', 'it'].find(l => l && dati.lingue.includes(l)) || dati.lingue[0];
  }

  function impostaLingua(l) {
    lingua = l;
    document.documentElement.lang = l;
    try { localStorage.setItem('guida-lingua', l); } catch (e) { }
    mostra();
  }

  function apriLingue() {
    const d = document.getElementById('scelta-lingua');
    document.getElementById('titolo-lingua').textContent = s('lingua');
    document.getElementById('elenco-lingue').innerHTML = dati.lingue.map(l =>
      `<button value="${l}" class="voce-lingua${l === lingua ? ' attiva' : ''}"><span>${esc(STR[l].nome)}</span><small>${l.toUpperCase()}</small></button>`).join('');
    d.onclose = () => { if (d.returnValue && d.returnValue !== lingua) impostaLingua(d.returnValue); };
    d.returnValue = '';
    d.showModal();
  }

  // ---------- pagine ----------

  const imp = () => dati.impostazioni;
  const mappaDi = (link, ricerca) => link || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(ricerca);
  const tel = n => 'tel:' + String(n).replace(/[^\d+]/g, '');
  const wa = n => 'https://wa.me/' + String(n).replace(/\D/g, '');

  const pulsanteLingua = () => `<button class="chip" data-azione="lingua" aria-label="${esc(s('lingua'))}">${icona('lingua')}<span>${lingua.toUpperCase()}</span></button>`;
  const avvisoOffline = () => offline ? `<p class="offline">${esc(s('offline'))}</p>` : '';

  function home() {
    const i = imp();
    const foto = i.foto ? ` style="--foto:url('${esc(i.foto)}')"` : '';
    const contatti = [
      i.telefono && `<a class="tondo" href="${tel(i.telefono)}" aria-label="${esc(s('chiama'))}">${icona('telefono')}</a>`,
      i.whatsapp && `<a class="tondo" href="${wa(i.whatsapp)}" target="_blank" rel="noopener" aria-label="WhatsApp">${icona('whatsapp')}</a>`,
      i.email && `<a class="tondo" href="mailto:${esc(i.email)}" aria-label="${esc(s('email'))}">${icona('email')}</a>`
    ].filter(Boolean).join('');
    return `
      <header class="copertina${i.foto ? ' con-foto' : ''}"${foto}>
        <div class="in-alto">${pulsanteLingua()}</div>
        ${i.logo ? `<img class="logo" src="${esc(i.logo)}" alt="">` : ''}
        <p class="occhiello">${esc(s('guida'))}</p>
        <h1>${esc(i.nome || '')}</h1>
        ${i.localita ? `<p class="localita">${icona('posizione')}${esc(i.localita)}</p>` : ''}
      </header>
      ${avvisoOffline()}
      <nav class="griglia">
        ${dati.sezioni.map(x => `<a class="pillola" href="#/${encodeURIComponent(x.id)}">${icona(x.icona || x.id)}<span>${esc(t(x.titolo))}</span></a>`).join('')}
      </nav>
      <footer class="piede">
        ${contatti ? `<div class="contatti-rapidi">${contatti}</div>` : ''}
        <button class="pulsante secondario" data-azione="pdf">${icona('pdf')}${esc(s('pdf'))}</button>
      </footer>`;
  }

  function riquadroCopia(etichetta, valore) {
    return `<div class="riga-copia"><div><small>${esc(etichetta)}</small><strong>${esc(valore)}</strong></div>
      <button class="pulsante piccolo" data-copia="${esc(valore)}">${icona('copia')}${esc(s('copia'))}</button></div>`;
  }

  // parti aggiuntive di alcune sezioni, prese da Impostazioni
  function extra(x) {
    const i = imp();
    const id = x.id.toLowerCase();
    if (id === 'wifi' && (i.wifi_nome || i.wifi_password)) {
      return `<div class="scheda">${i.wifi_nome ? riquadroCopia(s('rete'), i.wifi_nome) : ''}${i.wifi_password ? riquadroCopia(s('password'), i.wifi_password) : ''}</div>`;
    }
    if (id === 'dove' && i.indirizzo) {
      return `<div class="scheda"><p class="indirizzo">${icona('posizione')}${esc(i.indirizzo)}</p>
        <a class="pulsante" href="${esc(mappaDi(i.mappa, (i.nome || '') + ' ' + i.indirizzo))}" target="_blank" rel="noopener">${icona('mappa')}${esc(s('mappe'))}</a></div>`;
    }
    if (id === 'contatti') {
      return `<div class="pulsanti">
        ${i.telefono ? `<a class="pulsante" href="${tel(i.telefono)}">${icona('telefono')}${esc(s('chiama'))} · ${esc(i.telefono)}</a>` : ''}
        ${i.whatsapp ? `<a class="pulsante" href="${wa(i.whatsapp)}" target="_blank" rel="noopener">${icona('whatsapp')}WhatsApp</a>` : ''}
        ${i.email ? `<a class="pulsante secondario" href="mailto:${esc(i.email)}">${icona('email')}${esc(i.email)}</a>` : ''}
      </div>`;
    }
    if (id === 'emergenze') {
      return `<div class="pulsanti"><a class="pulsante urgente" href="tel:112">${icona('telefono')}112 · ${esc(s('emergenza'))}</a></div>`;
    }
    return '';
  }

  function luogo(l) {
    const azioni = [
      `<a class="pulsante piccolo" href="${esc(mappaDi(l.mappa, l.nome + ' ' + (l.indirizzo || imp().localita || '')))}" target="_blank" rel="noopener">${icona('mappa')}${esc(s('mappe'))}</a>`,
      l.telefono && `<a class="pulsante piccolo secondario" href="${tel(l.telefono)}">${icona('telefono')}${esc(s('chiama'))}</a>`,
      l.sito && `<a class="pulsante piccolo secondario" href="${esc(l.sito)}" target="_blank" rel="noopener">${icona('sito')}${esc(s('sito'))}</a>`
    ].filter(Boolean).join('');
    return `<li class="luogo"><h3>${esc(l.nome)}</h3>${l.indirizzo ? `<p class="dove">${esc(l.indirizzo)}</p>` : ''}
      ${formatta(t(l.testo))}<div class="azioni">${azioni}</div></li>`;
  }

  function sezione(x) {
    const luoghi = dati.luoghi.filter(l => (l.sezione || '').toLowerCase() === x.id.toLowerCase());
    return `
      <header class="barra">
        <a class="chip" href="#/">${icona('indietro')}<span>${esc(s('indietro'))}</span></a>
        ${pulsanteLingua()}
      </header>
      ${avvisoOffline()}
      <article class="sezione">
        <div class="titolo-sezione"><span class="bollo">${icona(x.icona || x.id)}</span><h1>${esc(t(x.titolo))}</h1></div>
        <div class="testo">${formatta(t(x.testo))}</div>
        ${extra(x)}
        ${luoghi.length ? `<ul class="luoghi">${luoghi.map(luogo).join('')}</ul>` : ''}
      </article>
      <nav class="successiva">${prossima(x)}</nav>`;
  }

  function prossima(x) {
    const n = dati.sezioni[dati.sezioni.indexOf(x) + 1];
    return n ? `<a class="pillola" href="#/${encodeURIComponent(n.id)}">${icona(n.icona || n.id)}<span>${esc(t(n.titolo))}</span>${icona('freccia', 'ico freccia')}</a>` : '';
  }

  // cartello da stampare e lasciare in camera: indirizzo #/cartello, non compare tra le sezioni
  function cartello() {
    const i = imp();
    const saluti = ['it', 'en', 'de', 'fr', 'es'].filter(l => dati.lingue.includes(l)).map(l => STR[l].qr);
    return `
      <div class="non-stampare barra">
        <a class="chip" href="#/">${icona('indietro')}<span>${esc(s('indietro'))}</span></a>
        <button class="pulsante" onclick="print()">${icona('pdf')}${esc(s('pdf'))}</button>
      </div>
      <section class="cartello">
        ${i.logo ? `<img class="logo" src="${esc(i.logo)}" alt="">` : ''}
        <p class="occhiello">${dati.lingue.slice(0, 3).map(l => esc(STR[l].guida)).join(' · ')}</p>
        <h1>${esc(i.nome || '')}</h1>
        <div id="cartello-qr"></div>
        <ul class="saluti">${saluti.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        ${i.wifi_nome ? `<div class="cartello-wifi">${icona('wifi')}<div><small>WiFi</small><strong>${esc(i.wifi_nome)}</strong>${i.wifi_password ? `<small>${esc(s('password'))}</small><strong>${esc(i.wifi_password)}</strong>` : ''}</div></div>` : ''}
        <p class="cartello-link">${esc((i.link || location.origin + location.pathname).replace(/^https?:\/\//, ''))}</p>
      </section>`;
  }

  async function qr(contenitore, testo, lato) {
    try {
      await caricaQR();
      const colore = getComputedStyle(document.documentElement).getPropertyValue('--verde').trim() || '#3f5e4f';
      new QRCode(contenitore, { text: testo, width: lato, height: lato, colorDark: colore, colorLight: '#ffffff' });
    } catch (e) { console.warn('QR non disponibile', e); }
  }

  function mostra() {
    const id = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    document.body.classList.toggle('pagina-cartello', id === 'cartello');
    if (id === 'cartello') {
      app.innerHTML = cartello();
      qr(document.getElementById('cartello-qr'), imp().link || location.origin + location.pathname, 240);
      return;
    }
    const x = id && dati.sezioni.find(z => z.id === id);
    app.innerHTML = x ? sezione(x) : home();
    document.title = (x ? t(x.titolo) + ' · ' : '') + (imp().nome || s('guida'));
  }

  // ---------- PDF (stampa) ----------

  function caricaQR() {
    if (window.QRCode) return Promise.resolve();
    return new Promise((ok, ko) => {
      const sc = document.createElement('script');
      sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      sc.onload = ok; sc.onerror = ko;
      document.head.appendChild(sc);
    });
  }

  async function stampa() {
    const i = imp();
    const link = (i.link || location.origin + location.pathname) + '?lang=' + lingua;
    const st = document.getElementById('stampa');
    st.innerHTML = `
      <section class="st-copertina">
        <p class="occhiello">${esc(s('guida'))}</p>
        <h1>${esc(i.nome || '')}</h1>
        ${i.localita ? `<p>${esc(i.localita)}</p>` : ''}
        <div id="st-qr"></div>
        <p class="st-qr-testo">${esc(s('qr'))}</p>
      </section>
      ${dati.sezioni.map(x => {
        const luoghi = dati.luoghi.filter(l => (l.sezione || '').toLowerCase() === x.id.toLowerCase());
        const id = x.id.toLowerCase();
        const righe = [];
        if (id === 'wifi') { if (i.wifi_nome) righe.push(`${s('rete')}: <strong>${esc(i.wifi_nome)}</strong>`); if (i.wifi_password) righe.push(`${s('password')}: <strong>${esc(i.wifi_password)}</strong>`); }
        if (id === 'dove' && i.indirizzo) righe.push(esc(i.indirizzo));
        if (id === 'contatti') { if (i.telefono) righe.push(`${s('chiama')}: ${esc(i.telefono)}`); if (i.whatsapp) righe.push(`WhatsApp: ${esc(i.whatsapp)}`); if (i.email) righe.push(`${s('email')}: ${esc(i.email)}`); }
        if (id === 'emergenze') righe.push(`<strong>112</strong> · ${esc(s('emergenza'))}`);
        return `<section class="st-sezione">
          <h2>${icona(x.icona || x.id)}${esc(t(x.titolo))}</h2>
          ${formatta(t(x.testo))}
          ${righe.length ? `<p class="st-dati">${righe.join('<br>')}</p>` : ''}
          ${luoghi.map(l => `<div class="st-luogo"><h3>${esc(l.nome)}</h3>${l.indirizzo ? `<p class="dove">${esc(l.indirizzo)}${l.telefono ? ' · ' + esc(l.telefono) : ''}</p>` : ''}${formatta(t(l.testo))}</div>`).join('')}
        </section>`;
      }).join('')}`;
    await qr(document.getElementById('st-qr'), link, 160);
    setTimeout(() => window.print(), 300);
  }

  // ---------- eventi ----------

  function avviso(testo) {
    const a = document.getElementById('avviso');
    a.textContent = testo;
    a.classList.add('visibile');
    clearTimeout(avviso.timer);
    avviso.timer = setTimeout(() => a.classList.remove('visibile'), 1800);
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-azione], [data-copia]');
    if (!b) return;
    if (b.dataset.copia) {
      navigator.clipboard.writeText(b.dataset.copia).then(() => avviso(s('copiato')), () => avviso(b.dataset.copia));
    } else if (b.dataset.azione === 'lingua') apriLingue();
    else if (b.dataset.azione === 'pdf') stampa();
  });

  window.addEventListener('hashchange', () => { mostra(); window.scrollTo(0, 0); });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => { });
  }

  carica().then(d => {
    dati = d;
    applicaStile(imp());
    lingua = scegliLinguaIniziale();
    document.documentElement.lang = lingua;
    mostra();
  }).catch(e => {
    app.innerHTML = `<p class="errore">La guida non è raggiungibile in questo momento. / The guide is not available right now.</p>`;
    console.error(e);
  });
})();
