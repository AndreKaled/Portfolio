async function fetchWithCache(url, cacheKey, ttl = 600000) { // 10 min
    const cached = localStorage.getItem(cacheKey);
    const now = new Date().getTime();

    if (cached) {
        const { data, expiry } = JSON.parse(cached);
        if (now < expiry) return data;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    localStorage.setItem(cacheKey, JSON.stringify({ data, expiry: now + ttl }));
    return data;
}

const GITHUB_USER = 'AndreKaled';

/**
 * Renderiza os repositórios no Dashboard (Bento Grid)
 */
async function fetchGitHubData() {
    const listContainer = document.getElementById('repo-list-container');
    if (!listContainer) return;

    try {
        const response = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?type=all&sort=updated&direction=desc&per_page=6`);
        if (!response.ok) throw new Error('ERR_CONNECTION_FAILED');
        
        const repos = await response.json();
        
        const reposHTML = repos
            .filter(repo => !repo.fork)
            .map(repo => {
                const desc = repo.description || "Projeto em desenvolvimento técnico.";
                const lang = repo.language && repo.language !== "Code" ? repo.language : "Logic";
                
                return `
                    <div class="repo-item">
                        <a href="${repo.html_url}" target="_blank" class="repo-link">./${repo.name}</a>
                        <p class="repo-desc">> ${desc}</p>
                        <span class="repo-lang">[${lang}]</span>
                    </div>
                `;
            }).join('');

        listContainer.innerHTML = reposHTML;

    } catch (error) {
        listContainer.innerHTML = `<div class="error-msg">[zsh] github_api_sync: failed to fetch data</div>`;
        console.error(error);
    }
}

/**
 * Renderiza o Log de Eventos na aba System Logs
 */
async function fetchGitHubEvents() {
    const eventsContainer = document.getElementById('events-feed');
    if (!eventsContainer) return;

    try {
        const response = await fetch(`https://api.github.com/users/${GITHUB_USER}/events/public?per_page=100`);
        if (!response.ok) throw new Error('ERR_EVENTS_FETCH_FAILED');
        
        const events = await response.json();
        eventsContainer.innerHTML = '';

        // filtra eventos irrelevantes ou sem mensagens de commit reais
        const filteredEvents = events.filter(event => {
            if (event.type === 'PushEvent') {
                const commits = event.payload.commits;
                return commits && commits.length > 0 && commits[0].message.trim().length > 0;
            }
            // Mantém interações como Create e Star
            return true; 
        });

        filteredEvents.slice(0, 50).forEach(event => {
            const date = new Date(event.created_at).toLocaleString('pt-BR');
            let actionText = '';
            
            switch(event.type) {
                case 'PushEvent':
                    const commits = event.payload.commits;
                    const commitMsg = (commits && commits.length > 0) 
                        ? commits[0].message 
                        : 'Push integration (no commit msg)';
                    
                    actionText = `<span class="event-type push">[PUSH]</span> ${commitMsg} in <strong>${event.repo.name}</strong>`;
                    break;
                case 'CreateEvent':
                    actionText = `<span class="event-type create">[CREATE]</span> New ${event.payload.ref_type}: <strong>${event.repo.name}</strong>`;
                    break;
                case 'WatchEvent':
                    actionText = `<span class="event-type star">[STAR]</span> Starred <strong>${event.repo.name}</strong>`;
                    break;
                default:
                    actionText = `<span class="event-type other">[EVENT]</span> Interaction with <strong>${event.repo.name}</strong>`;
            }

            const eventLine = document.createElement('div');
            eventLine.className = 'event-line';
            eventLine.innerHTML = `
                <span class="event-date">${date}</span>
                <p class="event-content">${actionText}</p>
            `;
            eventsContainer.appendChild(eventLine);
        });

        // sinalizador de fim de log se a lista for menor que o esperado
        if (filteredEvents.length > 0) {
            const endLine = document.createElement('div');
            endLine.className = 'event-line';
            endLine.style.opacity = "0.5";
            endLine.innerHTML = `
                <span class="event-date">---</span>
                <p class="event-content">[END_OF_BUFFER] - Apenas ${filteredEvents.length} eventos relevantes encontrados.</p>
            `;
            eventsContainer.appendChild(endLine);
        } else {
            eventsContainer.innerHTML = '<p class="repo-desc">> Nenhum evento relevante no buffer atual.</p>';
        }
    } catch (error) {
        eventsContainer.innerHTML = '<p class="error-msg">$ erro: falha ao sincronizar logs de eventos.</p>';
        console.error(error);
    }
}

async function fetchLanguageStats() {
    const bar = document.getElementById('global-lang-bar');
    const legend = document.getElementById('global-lang-legend');
    if (!bar || !legend) return;

    try {
        const reposResponse = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=40`);
        const repos = await reposResponse.json();

        const langData = {};
        let totalBytes = 0;

        // mapeando as URLs de linguagens de cada repo
        const langPromises = repos.map(repo => fetch(repo.languages_url).then(res => res.json()));
        const results = await Promise.all(langPromises);

        // agregamos os bytes
        results.forEach(data => {
            for (const [lang, bytes] of Object.entries(data)) {
                langData[lang] = (langData[lang] || 0) + bytes;
                totalBytes += bytes;
            }
        });

        // Cores padrão para as stacks
        const colors = {
            'Java': '#b07219',
            'Python': '#3572A5',
            'C': '#555555',
            'Kotlin': '#A97BFF',
            'JavaScript': '#f1e05a',
            'HTML': '#e34c26',
            'CSS': '#563d7c'
        };

        bar.innerHTML = '';
        legend.innerHTML = '';

        // ordenando por volume de uso
        const sortedLangs = Object.entries(langData).sort((a, b) => b[1] - a[1]);

        sortedLangs.forEach(([lang, bytes]) => {
            const percentage = ((bytes / totalBytes) * 100).toFixed(1);
            if (percentage < 0.5) return;

            const color = colors[lang] || '#888';

            // criar segmento da barra
            const segment = document.createElement('div');
            segment.className = 'lang-segment';
            segment.style.width = `${percentage}%`;
            segment.style.backgroundColor = color;
            segment.title = `${lang}: ${percentage}%`;
            bar.appendChild(segment);

            // criar item da legenda
            const item = document.createElement('div');
            item.className = 'lang-legend-item';
            item.innerHTML = `
                <span class="lang-dot" style="background-color: ${color}"></span>
                <span>${lang}</span>
                <span style="opacity: 0.5; margin-left: auto;">${percentage}%</span>
            `;
            legend.appendChild(item);
        });

    } catch (error) {
        console.error("Erro na telemetria de linguagens:", error);
    }
}

// Inicializa o Dashboard no load
document.addEventListener('DOMContentLoaded', fetchGitHubData);