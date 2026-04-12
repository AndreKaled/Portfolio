function showView(viewName) {
    const dashboard = document.getElementById('view-dashboard');
    const logs = document.getElementById('view-logs');

    if (viewName === 'logs') {
        dashboard.hidden = true;
        logs.hidden = false;
        fetchGitHubEvents();
        fetchLanguageStats();
    } else {
        dashboard.hidden = false;
        logs.hidden = true;
    }
    
    window.scrollTo(0, 0);
}