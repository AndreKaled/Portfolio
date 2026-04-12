function showView(viewName) {
    const dashboard = document.getElementById('view-dashboard');
    const logs = document.getElementById('view-logs');
    
    // 1. Alternar Visibilidade
    if (viewName === 'logs') {
        dashboard.hidden = true;
        logs.hidden = false;
        if (typeof fetchGitHubEvents === "function") fetchGitHubEvents();
        if (typeof fetchLanguageStats === "function") fetchLanguageStats();
    } else {
        dashboard.hidden = false;
        logs.hidden = true;
    }

    // 2. Atualizar Feedback do Nav
    const navLinks = document.querySelectorAll('.lab-header nav a');
    navLinks.forEach(link => {
        // Remove a classe de todos
        link.classList.remove('active');
        
        // Adiciona no link correspondente (baseado no texto ou parâmetro)
        // Se o link for de Projetos e a view for dashboard, ou Lab-Feed e view for logs
        if (viewName === 'dashboard' && link.textContent.includes('Projetos')) {
            link.classList.add('active');
        } else if (viewName === 'logs' && link.textContent.includes('Lab-Feed')) {
            link.classList.add('active');
        }
    });

    window.scrollTo(0, 0);
}

// Inicializa o estado ativo no load
document.addEventListener('DOMContentLoaded', () => {
    // Garante que o Dashboard comece como 'active'
    const projLink = Array.from(document.querySelectorAll('nav a'))
                          .find(el => el.textContent.includes('Projetos'));
    if (projLink) projLink.classList.add('active');
});