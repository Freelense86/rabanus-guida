# Guida per gli ospiti – Rabanus Guest House

Guida da consultare sul telefono (si installa come un'app), in 21 lingue europee, scaricabile in PDF con il QR code in copertina.

## Dove si scrivono i contenuti

Nel foglio Google «Guida ospiti B&B – contenuti»:

- **Impostazioni**: nome, indirizzo, telefono, WhatsApp, email, rete e password del WiFi, lingue offerte.
- **Sezioni**: una riga per sezione. Si scrivono solo le colonne gialle (id, ordine, visibile, icona, titolo_it, testo_it); le altre lingue si traducono da sole. Una traduzione sbagliata si corregge scrivendoci sopra a mano.
- **Luoghi**: ristoranti, bar, cose da vedere, negozi. La colonna «sezione» indica in quale sezione compaiono (l'id della sezione, es. `ristoranti`).

Nei testi: una riga vuota separa i paragrafi, le righe che iniziano con «- » diventano un elenco, `**parola**` diventa grassetto.
Un numero di telefono che inizia con + va scritto con l'apostrofo davanti: `'+39 333 …`.

Le sezioni con id `wifi`, `dove`, `contatti` ed `emergenze` mostrano in più i pulsanti presi da Impostazioni (copia password, apri in Maps, chiama, WhatsApp, 112).

Il foglio deve essere condiviso con «Chiunque abbia il link – Visualizzatore», altrimenti la guida non riesce a leggerlo.

## Stile

Nella scheda Impostazioni, sotto STILE: foto di copertina, logo, font dei titoli e dei testi (qualsiasi nome di fonts.google.com), sei colori (in esadecimale, es. `#c2553d`), forma dei pulsanti (pillola, arrotondata, squadrata) e colonne (1 o 2). Lasciando vuoto si usa lo stile predefinito. Per cambiamenti più profondi c'è `stile.css`.

## Cartello per la camera

Indirizzo della guida seguito da `#/cartello` (es. https://rabanus.it/guida/#/cartello): QR code, invito in più lingue e WiFi, da stampare. Il QR punta al valore `link` di Impostazioni.

## Pubblicazione

La guida è pubblicata con GitHub Pages dal ramo `main` di questo repository: ogni modifica caricata su GitHub va online da sola in un paio di minuti. I contenuti invece arrivano direttamente dal foglio, senza bisogno di ripubblicare.

Indirizzo: https://freelense86.github.io/rabanus-guida/ (poi guida.rabanus.it, con un record DNS CNAME `guida` → `freelense86.github.io` e il file `CNAME` nel repository).

L'ID del foglio è in `config.js`. Senza ID la guida mostra i contenuti di `esempio.json`.

## Provarla sul computer

    python3 -m http.server 8765

e aprire http://localhost:8765
