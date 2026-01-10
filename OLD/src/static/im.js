document.addEventListener('DOMContentLoaded', function() {
    const messageContainer = document.getElementById('messageContainer');
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');

    messageContainer.scrollTop = messageContainer.scrollHeight; 

    function appendMessage(message, isSent) {
        console.log("appendMessage вызвана:", message, isSent);
    
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(isSent ? 'sent' : 'received');
        
        
    
        if (!isSent) {
            const avatarAndUsername = document.createElement('a');
            avatarAndUsername.href = `/profile/${message.sender.username}`; 
            avatarAndUsername.classList.add('avatar-and-username');
        
            let imgSrc;
            if (message.sender && message.sender.avatar && !['null', 'None', 'Null', ''].includes(message.sender.avatar)) {
                imgSrc = avatarsBaseUrl + message.sender.avatar;
            } else {
                imgSrc = defaultAvatarsUrl;
            }
        
            const avatarElement = document.createElement('img');
            avatarElement.style.borderRadius = '50%';
            avatarElement.style.objectFit = 'cover';
            avatarElement.src = imgSrc;
            avatarElement.classList.add('message-avatar');
            avatarElement.width = 40;
            avatarElement.height = 40;
            avatarAndUsername.appendChild(avatarElement);
        
            const usernameElement = document.createElement('span');
            usernameElement.classList.add('username');
            usernameElement.textContent = message.sender.username;
            avatarAndUsername.appendChild(usernameElement);
        
            messageElement.appendChild(avatarAndUsername);
        }
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        
        const messageText = document.createElement('p');
        messageText.classList.add('message-text');

        // Проверяем, является ли текст ссылкой
        if (isValidUrl(message.text)) {
            const link = document.createElement('a');
            link.href = message.text;
            link.target = '_blank'; // Открываем ссылку в новой вкладке
            link.textContent = message.text;

            link.style.color = '#0084b2'; // Цвет ссылки (например, синий)
            link.style.textDecoration = 'underline'; // Подчеркивание

            messageText.appendChild(link);
        } else {
            // Обрабатываем Markdown
            const processedText = processMarkdown(message.text);
            messageText.innerHTML = processedText; // Устанавливаем HTML после обработки Markdown

            // Дополнительная обработка переносов строк (если нужно):
            // messageText.innerHTML = messageText.innerHTML.replace(/\n/g, '<br>'); 
        }
        messageContent.appendChild(messageText);
        
        const timeAndRead = document.createElement('div');
        timeAndRead.classList.add('time-and-read');
        
        const timestamp = document.createElement('span');
        timestamp.classList.add('timestamp');
        
        // Преобразуем timestamp в локальное время
        const date = new Date(message.timestamp);
        
        // Get the user's timezone offset in minutes
        const timezoneOffset = date.getTimezoneOffset();
        
        // Adjust the timestamp by the timezone offset
        date.setMinutes(date.getMinutes() + timezoneOffset);
        
        // Format the date and time according to your preferred format
        const options = { 
            hour: 'numeric', 
            minute: 'numeric', 
            // Add other options like day, month, year if needed
        };
        
        timestamp.textContent = date.toLocaleTimeString(undefined, options); 
        
        timeAndRead.appendChild(timestamp);
    
        if (isSent) {
            const readMark = document.createElement('span');
            readMark.classList.add('read-mark');
            readMark.textContent = '✓';
            readMark.style.color = message.read ? '#0084b2' : 'grey'; 
            timeAndRead.appendChild(readMark);
        }
    
        messageContent.appendChild(timeAndRead);
        messageElement.appendChild(messageContent);
        messageContainer.appendChild(messageElement);
    
        // Прокручиваем вниз, чтобы показать новые сообщения
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }

    // Функция для проверки, является ли строка допустимым URL
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;  
        }
    }

    messageForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const message = messageInput.value;
        if (message.trim() === '') {
            return;
        }

        // Создаем элемент сообщения с временной отметкой и неотправленной галочкой
        const tempMessage = {
            sender_id: currentUserId,
            text: message,
            timestamp: new Date().toISOString(),
            read: false
        };
        appendMessage(tempMessage, true);

        // Очищаем поле ввода сразу после отправки сообщения
        messageInput.value = ''; 

        fetch('/send_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `recipient_username=${recipientUsername}&message=${encodeURIComponent(message)}`
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка сети');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Обновляем временное сообщение (меняем галочку на отправленную)
                const lastMessage = messageContainer.lastChild;
                const readMark = lastMessage.querySelector('.read-mark');
                readMark.style.color = '#0084b2';
                messageInput.value = '';
            } else {
                // console.error('Ошибка при отправке сообщения:', data.error);
                // Обновляем временное сообщение (меняем галочку на ошибку)
                const lastMessage = messageContainer.lastChild;
                const readMark = lastMessage.querySelector('.read-mark');
                // readMark.style.color = '';
            }
        })
        .catch(error => {
            console.error('Ошибка при отправке сообщения:', error);
            // Обновляем временное сообщение (меняем галочку на ошибку)
            const lastMessage = messageContainer.lastChild;
            const readMark = lastMessage.querySelector('.read-mark');
            readMark.style.color = 'red';
        });
    });

    messageInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && event.shiftKey) {
            event.preventDefault();
            messageInput.value += '\n';

            // Увеличиваем высоту поля ввода при переходе на новую строку
            messageInput.style.height = (messageInput.scrollHeight) + 'px';
        } else if (event.key === 'Enter' && !event.shiftKey) {
            // Отправляем сообщение, если нажат Enter без Shift
            messageForm.dispatchEvent(new Event('submit'));
        }
    });


    let delay = 10000;


    
    function loadNewMessages() {
        fetch(`/get_new_messages?recipient_username=${recipientUsername}&user_id=${currentUserId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка сети');
            }
            return response.json();
        })
        .then(data => {
            if (data.messages && data.messages.length > 0) {
                console.log("Найдены новые сообщения:", data.messages);

                data.messages.forEach(message => {
                    appendMessage(message, parseInt(message.sender_id) === currentUserId);
                });
                delay = 10000;
            } else {
                delay = 10000;
                // delay = Math.min(delay + 10000, 20000);
            }
            setTimeout(loadNewMessages, delay);
        })
        .catch(error => {
            console.error('Ошибка при получении новых сообщений:', error);
            setTimeout(loadNewMessages, delay);
        });
    }

    loadNewMessages();

    // Функция для обработки ссылок в существующих сообщениях
    function processExistingLinksAndMarkdown() {
        const messageElements = document.querySelectorAll('.message-text'); 
        messageElements.forEach(messageElement => {
            const textContent = messageElement.textContent; // Сохраняем исходный текст

            if (isValidUrl(textContent)) {
                const link = document.createElement('a');
                link.href = textContent;
                link.target = '_blank';
                link.textContent = textContent;
                link.style.color = '#0084b2';
                link.style.textDecoration = 'underline';

                // Заменяем текст сообщения на ссылку
                messageElement.innerHTML = ''; // Очищаем содержимое
                messageElement.appendChild(link);
            } else {
                // Обрабатываем Markdown
                const processedText = processMarkdown(textContent);
                messageElement.innerHTML = processedText; // Устанавливаем HTML после обработки Markdown
            }
        });
    }

    // Вызываем функцию для обработки существующих ссылок при загрузке страницы
    processExistingLinksAndMarkdown();


    function processMarkdown(text) {
        return marked.parse(text, { breaks: true }); // Включаем обработку переносов строк
    }

    messageContainer.scrollTop = messageContainer.scrollHeight; 

});