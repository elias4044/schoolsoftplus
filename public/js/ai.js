document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const aiMainOverlay = document.getElementById('ai-main-overlay');
    const aiChatWindow = document.getElementById('ai-chat-window');
    const aiToggleButton = document.getElementById('ai-toggle-button');
    const aiCloseBtn = document.querySelector('.ai-close-btn');
    const aiConversation = document.getElementById('ai-conversation');
    const aiInput = document.getElementById('ai-input');
    const aiSendBtn = document.getElementById('ai-send-btn');

    let isAILoading = false;

    // --- UI Controls ---
    function openAIChat() {
        aiMainOverlay.classList.add('is-active');
        aiToggleButton.classList.add('is-hidden');
        setTimeout(() => aiInput.focus(), 400);
    }

    function closeAIChat() {
        aiMainOverlay.classList.remove('is-active');
        aiToggleButton.classList.remove('is-hidden');
        aiInput.value = '';
    }

    function scrollToBottom() {
        aiConversation.scrollTop = aiConversation.scrollHeight;
    }

    function addMessage(text, sender = 'bot', isTemporary = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('ai-message', sender === 'user' ? 'ai-user' : 'ai-bot');

        const htmlText = marked.parse(text);
        messageDiv.innerHTML = `<p>${htmlText}</p>`;
        if (isTemporary) messageDiv.dataset.temporary = 'true';
        aiConversation.appendChild(messageDiv);
        scrollToBottom();
        return messageDiv;
    }

    function showLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.classList.add('ai-typing-indicator');
        loadingDiv.dataset.temporary = 'true';
        loadingDiv.innerHTML = `<span></span><span></span><span></span>`;
        aiConversation.appendChild(loadingDiv);
        scrollToBottom();
    }

    function hideLoadingIndicator() {
        const loadingDiv = aiConversation.querySelector('.ai-typing-indicator[data-temporary="true"]');
        if (loadingDiv) loadingDiv.remove();
    }

    function disableInput() {
        aiInput.disabled = true;
        aiSendBtn.disabled = true;
        aiInput.placeholder = 'AI is typing...';
    }

    function enableInput() {
        aiInput.disabled = false;
        aiSendBtn.disabled = false;
        aiInput.placeholder = 'Ask Schoolsoft+ AI anything...';
        aiInput.focus();
    }

    // --- AI Communication ---
    async function handleUserInput() {
        if (isAILoading || !aiInput.value.trim()) return;

        const userText = aiInput.value.trim();
        addMessage(userText, 'user');
        aiInput.value = '';

        isAILoading = true;
        disableInput();
        showLoadingIndicator();

        const cookieArray = JSON.parse(sessionStorage.getItem("cookies"));
        if (!cookieArray || !cookieArray.length) {
            console.error("No cookies stored");
            window.location.href = "/login.html";
            return;
        }
        const cookies = cookieArray.join("; ");

        try {
            const fullHistory = Array.from(aiConversation.children)
                .filter(el => !el.dataset.temporary)
                .map(el => {
                    const paragraphs = Array.from(el.querySelectorAll('p'));
                    const text = paragraphs
                        .map(p => p.textContent.trim())
                        .filter(t => t.length > 0)
                        .join('\n');

                    if (!text) return null;

                    return {
                        role: el.classList.contains('ai-user') ? 'user' : 'model',
                        parts: [{ text }]
                    };
                })
                .filter(Boolean);

            // Keep only the last 12 messages. Reduced to 6 and changed char limit too 1k.
            const history = fullHistory.slice(-6);







            const response = await fetch('/api/main', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api': 'ai',
                    cookies
                },
                body: JSON.stringify({ message: userText, history, username: sessionStorage.getItem('username') }),

            });

            if (!response.ok) {
                const result = await response.json();
                if (result.message) {
                    addMessage(result.data, 'bot');
                } else {
                    addMessage("Sorry, I couldn't get a clear response. Please try again.", 'bot');
                }
                return;
            }


            const data = await response.json();
            const reply = data.data
                || data.message || "Sorry, I couldn't get a clear response. Please try again.";

            addMessage(reply, 'bot');
        } catch (err) {
            console.error(err);
            addMessage(err, 'bot');
        } finally {
            hideLoadingIndicator();
            enableInput();
            isAILoading = false;
        }
    }

    // --- Event Listeners ---
    aiToggleButton.addEventListener('click', openAIChat);
    aiCloseBtn.addEventListener('click', closeAIChat);
    aiSendBtn.addEventListener('click', handleUserInput);
    aiInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') handleUserInput();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && aiMainOverlay.classList.contains('is-active')) closeAIChat();
    });
});