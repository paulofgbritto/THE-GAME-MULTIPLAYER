# Servidor do multiplayer do tg 50

Este servidor só repassa mensagens entre os jogadores (cria as salas com código de 4 letras,
dá um número a cada um e responde o ping com o relógio comum). O jogo em si roda no computador
de cada um.

## Publicar de graça no Render (uma vez só, ~5 minutos)

1. Crie uma conta em https://render.com (dá para entrar com o GitHub).
2. Crie um repositório no GitHub e suba **o conteúdo desta pasta** (`server.js`, `package.json`, `render.yaml`).
3. No Render: **New → Blueprint** e escolha o repositório (ele lê o `render.yaml`).
   Ou: **New → Web Service**, Runtime *Node*, Build `npm install`, Start `node server.js`, plano **Free**.
4. Quando terminar, o Render mostra um endereço tipo `https://tg50-relay-xxxx.onrender.com`.
5. No jogo: **Multiplayer**, campo **Servidor**, escreva o mesmo endereço trocando `https://` por `wss://`
   (ex.: `wss://tg50-relay-xxxx.onrender.com`). O jogo guarda o endereço para as próximas vezes.

Se o nome `tg50-relay` estiver livre no Render, o endereço fica igual ao padrão do jogo
(`wss://tg50-relay.onrender.com`) e não precisa mudar nada.

**Plano gratuito:** o servidor dorme depois de 15 minutos sem ninguém. A primeira ligação acorda ele
e pode levar até 1 minuto — o jogo espera até 75 s e avisa.

## Testar se os amigos conseguem entrar

- No jogo: **Testar servidor** (mostra o tempo de resposta e quantas salas estão abertas).
- **Página de teste p/ amigos**: abre `https://SEU-ENDERECO/teste` no navegador. Mande esse endereço para
  eles: se aparecer **ligado** e o ping, o computador deles consegue entrar nas partidas.

## Sem servidor na internet (LAN ou Radmin VPN)

- Quem hospeda: **Hospedar na minha rede (LAN)**. O jogo dele vira o servidor na porta 6510
  (o Windows pode pedir permissão do firewall: permita).
- Os outros: **Entrar por IP**, com o IP de quem hospeda (o `ipconfig` mostra; no Radmin VPN é o IP que aparece
  ao lado do nome, começando com 26.).

## Rodar no próprio computador (teste)

```
npm install
node server.js
```
e no jogo use `ws://localhost:10000`.
