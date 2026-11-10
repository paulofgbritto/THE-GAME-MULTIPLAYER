// ============================================================================
//  tg 50 — servidor de retransmissão
// ============================================================================
//  Não sabe nada do jogo. Cria salas com código de 4 letras, dá um número a
//  cada jogador, repassa as mensagens e responde o ping com a hora dele (o
//  relógio comum da partida). O primeiro da sala é o anfitrião; se ele sair,
//  o mais antigo que ficou vira anfitrião.
//
//  Rotas HTTP:  /saude  (JSON: salas, jogadores)   /teste  (página para os
//  amigos conferirem no navegador se conseguem se ligar)
// ============================================================================
const http = require('http');
const { WebSocketServer } = require('ws');

const PORTA = process.env.PORT || 10000;
const MAX_POR_SALA = 8;
const salas = new Map();         // código -> { jogadores: Map(id -> ws), anfitriao, prox }
let total = 0;

function codigoNovo() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c;
  do { c = Array.from({ length: 4 }, () => L[Math.floor(Math.random() * L.length)]).join(''); }
  while (salas.has(c));
  return c;
}

function enviar(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function paraSala(sala, obj, menos) {
  const txt = JSON.stringify(obj);
  for (const [id, ws] of sala.jogadores) if (id !== menos && ws.readyState === 1) ws.send(txt);
}

const PAGINA_TESTE = `<!doctype html><html lang="pt-br"><meta charset="utf-8">
<title>tg 50 — teste de ligação</title>
<style>body{background:#0c0a18;color:#ddd;font:18px system-ui;display:grid;place-items:center;height:100vh;margin:0}
.c{background:#171427;padding:32px 40px;border-radius:16px;border:1px solid #554d7a;max-width:520px}
h1{margin:0 0 12px;color:#ffe7b0}.ok{color:#8f8}.no{color:#f88}small{color:#99a}</style>
<div class="c"><h1>tg 50</h1><p id="s">Ligando no servidor...</p><p id="p"></p>
<small>Se aparecer <b class="ok">ligado</b>, o seu computador consegue entrar nas partidas. A primeira vez pode demorar até 1 minuto (o servidor gratuito acorda).</small></div>
<script>
const s=document.getElementById('s'),p=document.getElementById('p');
const ws=new WebSocket(location.origin.replace(/^http/,'ws'));
ws.onopen=()=>{s.innerHTML='<b class="ok">ligado</b>';setInterval(()=>ws.send(JSON.stringify({t:'ping',c:performance.now()})),1000)};
ws.onmessage=e=>{const o=JSON.parse(e.data);if(o.t==='pong')p.textContent='atraso (ping): '+Math.round(performance.now()-o.c)+' ms'};
ws.onclose=()=>{s.innerHTML='<b class="no">não ligou</b> — confira a internet ou o endereço'};
</script></html>`;

const servidor = http.createServer((req, res) => {
  if (req.url.startsWith('/saude')) {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ ok: true, salas: salas.size, jogadores: total, hora: Date.now() }));
  } else if (req.url.startsWith('/teste') || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(PAGINA_TESTE);
  } else { res.writeHead(404); res.end(); }
});

const wss = new WebSocketServer({ server: servidor, maxPayload: 64 * 1024 });

wss.on('connection', (ws) => {
  ws.sala = null;
  ws.id = 0;
  ws.vivo = true;
  total++;
  ws.on('pong', () => { ws.vivo = true; });

  ws.on('message', (dados) => {
    // O jogo pode mandar como texto ou binário: tanto faz.
    for (const linha of dados.toString().split('\n')) {
      if (!linha.trim()) continue;
      let o;
      try { o = JSON.parse(linha); } catch { continue; }
      tratar(ws, o);
    }
  });

  ws.on('close', () => {
    total--;
    sair(ws);
  });
});

function tratar(ws, o) {
  switch (o.t) {
    case 'ping':
      enviar(ws, { t: 'pong', c: o.c, s: Date.now() });
      break;

    case 'criar': {
      sair(ws);
      const c = codigoNovo();
      const sala = { jogadores: new Map(), anfitriao: 1, prox: 2 };
      salas.set(c, sala);
      ws.sala = c; ws.id = 1;
      sala.jogadores.set(1, ws);
      enviar(ws, { t: 'sala', sala: c, id: 1, anfitriao: 1 });
      console.log(`sala ${c} criada`);
      break;
    }

    case 'entrar': {
      const c = String(o.sala || '').toUpperCase();
      const sala = salas.get(c);
      if (!sala) { enviar(ws, { t: 'erro', m: `Não existe sala ${c}. Confira o código.` }); break; }
      if (sala.jogadores.size >= MAX_POR_SALA) { enviar(ws, { t: 'erro', m: 'A sala está cheia.' }); break; }
      sair(ws);
      const id = sala.prox++;
      ws.sala = c; ws.id = id;
      sala.jogadores.set(id, ws);
      enviar(ws, { t: 'sala', sala: c, id, anfitriao: sala.anfitriao });
      paraSala(sala, { t: 'entrou', id }, id);
      break;
    }

    case 'msg': {
      const sala = salas.get(ws.sala);
      if (!sala) break;
      const pacote = { t: 'msg', de: ws.id, d: o.d };
      // Mensagem para um só (d.para) ou para todos
      if (o.d && typeof o.d.para === 'number') {
        const alvo = sala.jogadores.get(o.d.para);
        if (alvo) enviar(alvo, pacote);
      } else paraSala(sala, pacote, ws.id);
      break;
    }
  }
}

function sair(ws) {
  if (!ws.sala) return;
  const codigo = ws.sala;
  const sala = salas.get(codigo);
  ws.sala = null;
  if (!sala) return;
  sala.jogadores.delete(ws.id);
  paraSala(sala, { t: 'saiu', id: ws.id });
  if (sala.jogadores.size === 0) { salas.delete(codigo); console.log(`sala ${codigo} fechada`); return; }
  if (sala.anfitriao === ws.id) {
    sala.anfitriao = Math.min(...sala.jogadores.keys());
    paraSala(sala, { t: 'anfitriao', id: sala.anfitriao });
  }
}

// Derruba ligações mortas (Wi-Fi caiu sem avisar)
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.vivo) { ws.terminate(); continue; }
    ws.vivo = false;
    ws.ping();
  }
}, 15000);

servidor.listen(PORTA, () => console.log(`tg 50 relay na porta ${PORTA}`));
