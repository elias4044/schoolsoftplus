// On window load
window.addEventListener('load', async function () {

    const cookieArray = JSON.parse(sessionStorage.getItem('cookies') || '[]');
    if (!cookieArray || !cookieArray.length) {
        window.location.href = "/login.html";
    }
    const cookies = cookieArray.join('; ');


    // Fetch user data
    const res = await fetch('/api/admin?api=auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookies },
        body: JSON.stringify({ username: sessionStorage.getItem('username') })
    });
   
    if (res.status !== 200) {
        window.location.href = "/admin/info";
    }

    this.document.getElementById("auth-container").classList.add("hidden");


});