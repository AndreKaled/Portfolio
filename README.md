![GitHub License](https://img.shields.io/github/license/AndreKaled/AndreKaled.github.io)
![Vercel Deploy](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)
# Portfólio — André Kaled
Este projeto é o meu hub pessoal de projetos e telemetria de código. O objetivo foi criar uma interface limpa e funcional que centraliza minhas atividades acadêmicas na UFAM, projetos que fiz/faço/estou fazendo (muitos em fazendo) e histórico de contribuições no GitHub.

## Overview
O site funciona como um Dashboard que consome dados em tempo real. Ele foi projetado para ser leve e independente de frameworks pesados, evitando Garbage In para não ter Garbage Out.

## Techs and Stacks
- **Frontend:** HTML5 e CSS3
- **Runtime:** JavaScript
- **APIs Externas:** GitHub API, LeetCard API, GitHub Chart API
- **Fonts:** Geist Sans & Mono (Vercel)
- **Deploy:** Vercel (Node.js 24 runtime)

## Arquitetura e Funcionalidades

- **View Management:** Sistema de Single Page Application (SPA) minimalista utilizando manipulação do atributo `hidden` para transição instantânea entre Dashboard e Logs
- **Modular CSS:** Estilização organizada em módulos (`base`, `dashboard`, `terminal`, `logs`, `error`) para facilitar a manutenção e evitar conflitos de escopo
- **GitHub API Integration:** Consumo dinâmico de metadados, eventos de push, criação de branches e contribuições externas via transações de eventos
- **Parallel Fetching:** Processamento paralelo de Promises para coleta de dados de múltiplas fontes
- **Competitive Programming Stats:** Integração com LeetCode para exibição de métricas de resolução de problemas algorítmicos, embora minha participação seja maior na Olimpiada Brasileira de Informática e na Maratona de Programação da SBC
- **Telemetry (Languages):** Algoritmo de agregação que analisa bytes de código de múltiplos repositórios para gerar um relatório de linguagens usadas ultimamente
- **Cache System (LocalStorage):** Wrapper customizado sobre a Fetch API com persistência em cache (TTL dinâmico) para otimização de tráfego e contornar Rate Limits

## Como rodar localmente
Como o projeto não possui dependências, a execução é simples:

Clone o repositório:
```bash
git clone https://github.com/AndreKaled/Portfolio.git
```
Abra o arquivo index.html diretamente no navegador ou utilize uma extensão como o Live Server no VS Code.

>[!NOTE] 
**P.S.:** O Gemini cuidou de toda a parte de CSS e refinamento visual desse projeto, já que eu não suporto lidar com frontend, então se houver uma hydra na pasta css eu me asbtenho da responsabilidade de lutar contra esse monstro, brincar com Agentes é mais divertido.

## Easter Egg
Tente inserir uma rota doida no endereço do navegador