async function fetchWithCache(url, cacheKey, ttl = 600000) { // 10 min default
    const cached = localStorage.getItem(cacheKey);
    const now = new Date().getTime();

    if (cached) {
        try{
            const { data, expiry } = JSON.parse(cached);
            if (now < expiry) return data;
        }catch (e) {
            localStorage.removeItem(cacheKey);
        }
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
        const url = `https://api.github.com/users/${GITHUB_USER}/repos?type=all&sort=updated&direction=desc&per_page=6`;
        const repos = await fetchWithCache(url, `repos_dashboard_${GITHUB_USER}`,1800000);
        
        const reposHTML = repos
            .filter(repo => !repo.fork)
            .map(repo => {
                const desc = repo.description || "Projeto em desenvolvimento.";
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
        const url = `https://api.github.com/users/${GITHUB_USER}/events/public?per_page=100`;        
        const events = await fetchWithCache(url, `events_full_${GITHUB_USER}`,1800000);

        eventsContainer.innerHTML = '';

        // filtra eventos irrelevantes ou sem mensagens de commit reais
        const filteredEvents = events.filter(event => {
            if (event.type === 'PushEvent') {
                const commits = event.payload.commits;
                if (commits && commits.length > 0) {
                    return commits[0].message.trim().length > 0;
                }
                return true;
            }
            return true; 
        });

        filteredEvents.slice(0, 50).forEach(event => {
            const date = new Date(event.created_at).toLocaleString('pt-BR');
            let actionText = '';
            
            switch(event.type) {
                case 'PushEvent':
                    const commits = event.payload.commits;
                    const headHash = event.payload.head ? event.payload.head.substring(0, 7) : 'unknown';
                    
                    const commitMsg = (commits && commits.length > 0) 
                        ? commits[0].message 
                        : `Pushed new changes [head: ${headHash}]`;
                    
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
        const url1 = `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=30`;
        const url2 = `https://api.github.com/users/${GITHUB_USER}/events/public?per_page=50`;
        const repos = await fetchWithCache(url1,`repos_data_${GITHUB_USER}`,1800000);

        const events = await fetchWithCache(url2,`events_data_${GITHUB_USER}`,1800000);

        const langData = {};
        let totalBytes = 0;
        
        const languageUrls = new Set(repos.map(r => r.languages_url));

        events.forEach(event => {
            if (event.type === 'PushEvent' && event.repo) {
                const url = `https://api.github.com/repos/${event.repo.name}/languages`;
                languageUrls.add(url);
            }
        });

        const langPromises = Array.from(languageUrls).map(url => {
            const repoId = url.split('/').slice(-2, -1)[0];
            return fetchWithCache(url,`lang_data_${repoId}`, 1800000)
            .catch(() => ({}));
        });
        
        const results = await Promise.all(langPromises);

        results.forEach(data => {
            for (const [lang, bytes] of Object.entries(data)) {
                langData[lang] = (langData[lang] || 0) + bytes;
                totalBytes += bytes;
            }
        });

        const colors = {
            'Java': '#b07219', 
            'Python': '#3572A5', 
            'C': '#555555',
            'Kotlin': '#A97BFF', 
            'JavaScript': '#f1e05a', 
            'HTML': '#e34c26',
            'CSS': '#563d7c', 
            'C++': '#f34b7d', 
            'Shell': '#89e051'
        };

        bar.innerHTML = '';
        legend.innerHTML = '';

        const sortedLangs = Object.entries(langData).sort((a, b) => b[1] - a[1]);

        sortedLangs.forEach(([lang, bytes]) => {
            const percentage = ((bytes / totalBytes) * 100).toFixed(1);
            if (parseFloat(percentage) < 0.1) return;

            const color = colors[lang] || '#888';

            const segment = document.createElement('div');
            segment.className = 'lang-segment';
            segment.style.width = `${percentage}%`;
            segment.style.backgroundColor = color;
            segment.title = `${lang}: ${percentage}%`;
            bar.appendChild(segment);

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