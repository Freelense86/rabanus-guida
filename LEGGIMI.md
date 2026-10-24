# Guida per gli ospiti del B&B

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

## Pubblicazione

Sono file statici: si caricano così come sono (tutti i file di questa cartella) sul proprio spazio web, via FTP o dal pannello dell'hosting, in una cartella o in un sottodominio (es. `guida.tuodominio.it`). Serve HTTPS per l'installazione come app e per l'uso offline.

L'ID del foglio è in `config.js`. Senza ID la guida mostra i contenuti di `esempio.json`.

## Provarla sul computer

    python3 -m http.server 8765

e aprire http://localhost:8765
