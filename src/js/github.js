async function fetchWithCache(url, cacheKey, ttl = 600000) {
    const cached = localStorage.getItem(cacheKey);
    const now = Date.now();

    if (cached) {
        try {
            const { data, expiry } = JSON.parse(cached);

            if (now < expiry) {
                return data;
            }
        } catch (e) {
            localStorage.removeItem(cacheKey);
        }
    }

    const response = await fetch(
        `/api/github?url=${encodeURIComponent(url)}`
    );

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    localStorage.setItem(cacheKey, JSON.stringify({
        data,
        expiry: now + ttl
    }));

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

function classifyCommit(message) {
    const msg = message.toLowerCase();

    if (msg.includes('feat:') || msg.includes('feature:')) {
        return { tag: '[FEATURE]', className: 'feature' };
    }
    else if (msg.includes('fix:') || msg.includes('bug:')) {
        return { tag: '[FIX]', className: 'fix' };
    }
    else if (msg.includes('refactor:')) {
        return { tag: '[REFACTOR]', className: 'refactor' };
    }
    else if (msg.includes('docs:') || msg.includes('doc:')) {
        return { tag: '[DOC]', className: 'doc' };
    }
    else if (msg.includes('merge')) {
        return { tag: '[MERGE]', className: 'merge' };
    }
    else {
        return { tag: '[UPDATE]', className: 'default' };
    }
}

function isLowQualityCommit(message) {
    const msg = message.trim().toLowerCase();

    const ignoredMessages = [
        '.',
        'teste',
        'test',
        'aaa',
        'wip'
    ];

    return ignoredMessages.includes(msg) || msg.length <= 3;
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
            return [
                'PushEvent',
                'CreateEvent',
                'WatchEvent',
                'IssuesEvent'
            ].includes(event.type);
        });

        for (const event of filteredEvents.slice(0, 50)) {
            const date = new Date(event.created_at).toLocaleString('pt-BR');
            let actionText = '';

            switch(event.type) {
                case 'PushEvent':
                    const commits = event.payload.commits || [];
                    const repoName = event.repo.name.split('/')[1];

                    let commitMsg = null;

                    const relevantCommit = commits.find(commit =>
                        commit.message &&
                        !isLowQualityCommit(commit.message)
                    );

                    if (relevantCommit) {
                        commitMsg = relevantCommit.message.split('\n')[0];
                    }

                    if (!commitMsg && event.payload.head) {
                        try {
                            const commitData = await fetchWithCache(
                                `https://api.github.com/repos/${event.repo.name}/commits/${event.payload.head}`,
                                `commit_${event.payload.head}`,
                                1800000
                            );

                            if (
                                commitData.commit?.message &&
                                !isLowQualityCommit(commitData.commit.message)
                            ) {
                                commitMsg = commitData.commit.message.split('\n')[0];
                            }
                        } catch (e) {
                            console.error('Erro ao buscar commit específico:', e);
                        }
                    }

                    if (!commitMsg) {
                        commitMsg = `Push realizado em ${repoName}`;
                    }

                    const commitInfo = classifyCommit(commitMsg);
                    const commitCount = commits.length;

                    let multiCommitText = '';
                    if (commitCount > 1) {
                        multiCommitText = ` <span class="commit-count">(+${commitCount - 1} commits)</span>`;
                    }

                    actionText = `
                        <span class="event-type ${commitInfo.className}">${commitInfo.tag}</span>
                        ${commitMsg}
                        in <strong>${repoName}</strong>
                        ${multiCommitText}
                    `;
                    break;
                case 'CreateEvent':
                    actionText = `
                        <span class="event-type create">[CREATE]</span>
                        New ${event.payload.ref_type}: <strong>${event.repo.name}</strong>
                    `;
                    break;

                case 'WatchEvent':
                    actionText = `
                        <span class="event-type star">[STAR]</span>
                        Starred <strong>${event.repo.name}</strong>
                    `;
                    break;

                case 'IssuesEvent':
                    const action = event.payload.action;
                    const issue = event.payload.issue;

                    actionText = `
                        <span class="event-type issue">[ISSUE]</span>
                        ${action} issue: <strong>${issue.title}</strong>
                        in <strong>${event.repo.name.split('/')[1]}</strong>
                    `;
                    break;
            }

            const eventLine = document.createElement('div');
            eventLine.className = 'event-line';
            eventLine.innerHTML = `
                <span class="event-date">${date}</span>
                <p class="event-content">${actionText}</p>
            `;

            eventsContainer.appendChild(eventLine);
        };

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
document.addEventListener('DOMContentLoaded', () => {
    fetchGitHubData();
});