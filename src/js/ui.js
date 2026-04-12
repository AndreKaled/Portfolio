function showView(viewName) {
    const dashboard = document.getElementById('view-dashboard');
    const logs = document.getElementById('view-logs');
    
    if (viewName === 'logs') {
        dashboard.hidden = true;
        logs.hidden = false;
        if (typeof fetchGitHubEvents === "function") fetchGitHubEvents();
        if (typeof fetchLanguageStats === "function") fetchLanguageStats();
    } else {
        dashboard.hidden = false;
        logs.hidden = true;
    }

    const navLinks = document.querySelectorAll('.lab-header nav a');
    navLinks.forEach(link => {
        link.classList.remove('active');
        
        if (viewName === 'dashboard' && link.textContent.includes('Projetos')) {
            link.classList.add('active');
        } else if (viewName === 'logs' && link.textContent.includes('Lab-Feed')) {
            link.classList.add('active');
        }
    });

    window.scrollTo(0, 0);
}


document.addEventListener('DOMContentLoaded', () => {
    const projLink = Array.from(document.querySelectorAll('nav a'))
                          .find(el => el.textContent.includes('Projetos'));
    if (projLink) projLink.classList.add('active');
});