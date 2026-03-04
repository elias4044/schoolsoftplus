window.addEventListener('load', function() {
    const appTitle = this.document.querySelector('.sidebar-header').querySelector('h1');
    if (appTitle) {
        appTitle.addEventListener('click', () => {
            window.location.href = '/'
        })
    } else {
        console.error('App title not found');
    }

    const back = this.document.querySelector('.back-link');
    if (back) {
        back.addEventListener('click', () => {
            this.location.href = '/main.html';
        });
    }
});