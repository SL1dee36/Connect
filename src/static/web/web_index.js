document.addEventListener('DOMContentLoaded', () => {
    // --- Код для поиска друзей ---
    const searchInput = document.getElementById('friend-search-input');
    const searchButton = document.getElementById('friend-search-button');
    const friendsContainer = document.querySelector('.friends-slider');
    const initialFriendsContainer = friendsContainer.querySelector('.initial-friends');
    const initialFriendsHTML = initialFriendsContainer.innerHTML;
  
    let noFriendsMessage = null;
  
    function performSearch() {
      const searchQuery = searchInput.value.toLowerCase();
  
      if (searchQuery === '') {
        // Восстанавливаем начальный список друзей
        initialFriendsContainer.innerHTML = initialFriendsHTML;
        if (noFriendsMessage && initialFriendsContainer.contains(noFriendsMessage)) {
          initialFriendsContainer.removeChild(noFriendsMessage);
          noFriendsMessage = null;
        }
        return;
      }
  
      fetch('/search_friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: searchQuery })
      })
        .then(response => response.json())
        .then(data => {
          updateFriendList(data);
        })
        .catch(error => {
          console.error('Ошибка при поиске друзей:', error);
        });
    }
  
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('input', performSearch);
  
    function updateFriendList(users) {
      // Очищаем только список друзей, оставляя поисковую строку
      initialFriendsContainer.innerHTML = '';
  
      if (users.length === 0) {
        if (!noFriendsMessage) {
          noFriendsMessage = document.createElement('p');
          noFriendsMessage.textContent = 'Пользователи не найдены.';
          initialFriendsContainer.appendChild(noFriendsMessage);
        }
        return;
      }
  
      if (noFriendsMessage && initialFriendsContainer.contains(noFriendsMessage)) {
        initialFriendsContainer.removeChild(noFriendsMessage);
        noFriendsMessage = null;
      }
  
      users.forEach(user => {
        const userCard = document.createElement('div');
        userCard.classList.add('friend-card');
  
        const profileLink = document.createElement('a');
        profileLink.href = user.profile_url;
  
        const avatarImg = document.createElement('img');
        avatarImg.style.borderRadius = '50%';
        avatarImg.style.objectFit = 'cover';
        avatarImg.width = 40;
        avatarImg.height = 40;
        avatarImg.classList.add('friend-avatar');
  
        // Set avatar image source based on user.avatar_url
        if (user.avatar_url && user.avatar_url !== 'None') {
          avatarImg.src = user.avatar_url;
        } else {
          avatarImg.src = `{{ url_for('serve_icons', filename='rotatingdandelion.gif') }}`;
        }
  
        profileLink.appendChild(avatarImg);
  
        const usernameSpan = document.createElement('span');
        usernameSpan.classList.add('friend-username');
        usernameSpan.textContent = user.username;
  
        userCard.appendChild(profileLink);
        userCard.appendChild(usernameSpan);
        initialFriendsContainer.appendChild(userCard);
      });
    }
    // --- Конец кода для поиска друзей ---
  
  
    // --- Код для изменения размера контента ---
    const contentElement = document.querySelector('.content');
    const resizeHandle = document.querySelector('.resize-handle');
    let mouseMoveHandler = null;
    const minWidth = 100;
  
    let isResizing = false;
    let startX = 0;
    let wasOutside = false;
  
    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      document.body.style.userSelect = 'none';
      // resizeHandle.setCapture();
  
      // Меняем курсор на ew-resize
      resizeHandle.style.cursor = 'ew-resize';
    });
  
    document.addEventListener('mousemove', (e) => {
      // Меняем курсор при наведении на resizeHandle, если не изменяем размер
      if (!isResizing) {
        resizeHandle.style.cursor = 'ew-resize';
      }
  
      if (isResizing && !wasOutside) {
        const deltaX = e.clientX - startX;
        let newWidth = contentElement.offsetWidth + deltaX;
        newWidth = Math.max(minWidth, newWidth);
  
        // Проверяем, ушел ли курсор за левую границу
        if (e.clientX < contentElement.getBoundingClientRect().left) {
          newWidth = Math.max(minWidth, contentElement.offsetWidth - (contentElement.getBoundingClientRect().left - e.clientX));
        }
        // Проверяем, ушел ли курсор за правую границу
        else if (e.clientX > contentElement.getBoundingClientRect().right) {
          newWidth = Math.max(minWidth, contentElement.offsetWidth + (e.clientX - contentElement.getBoundingClientRect().right));
        }
  
        contentElement.style.width = newWidth + 'px';
        startX = e.clientX;
      }

      if (isResizing && !wasOutside) {
        updateChatWindowWidth();
      }
    });
  
    document.addEventListener('mouseup', () => {
      isResizing = false;
      document.body.style.userSelect = 'auto';
      // resizeHandle.releaseCapture();
  
      // Удаляем обработчик mousemove
      if (mouseMoveHandler) {
        document.removeEventListener('mousemove', mouseMoveHandler);
        mouseMoveHandler = null;
      }
  
      wasOutside = false;
  
      // Возвращаем обычный курсор
      resizeHandle.style.cursor = 'default';
    });
  
    contentElement.addEventListener('mouseleave', () => {
      wasOutside = true;
      // Возвращаем обычный курсор, если вышли за пределы контента
      resizeHandle.style.cursor = 'default';
    });
  
    contentElement.addEventListener('mouseenter', () => {
      wasOutside = false;
      // Меняем курсор на ew-resize, если вернулись в контент
      if (!isResizing) {
        resizeHandle.style.cursor = 'ew-resize';
      }
    });
    // --- Конец кода для изменения размера контента ---
  
  
    // --- Код для проверки высоты chat-list и открытия чата ---
    window.addEventListener('load', function () {
      const chatList = document.querySelector('.chat-list');
  
      function checkChatListHeight() {
        if (chatList.scrollHeight > chatList.clientHeight) {
          chatList.classList.add('overflow-auto');
        } else {
          chatList.classList.remove('overflow-auto');
        }
      }
  
      checkChatListHeight();
      window.addEventListener('resize', checkChatListHeight);
  
      // --- Обработчик для новых чатов --- 
      const chatListObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            checkChatListHeight(); // Проверяем высоту после добавления новых чатов
          }
        });
      });
  
      chatListObserver.observe(chatList, { childList: true });
      // --- Конец обработчика ---
      // web/web_index.js

      function updateChatWindowWidth() {
        const contentWidth = document.querySelector('.content').offsetWidth;
        const chatWindow = document.querySelector('.chat-window');
        chatWindow.style.width = `calc(100% - ${contentWidth}px)`;
      }

      // Call the function initially to set the initial width
      updateChatWindowWidth();

      // Add an event listener to recalculate width on window resize
      window.addEventListener('resize', updateChatWindowWidth);
      // --- Функция openChat() ---
    //   window.openChat = function(username) {
    //     const chatContainer = document.getElementById('chat-container');
    //     chatContainer.style.display = 'block';
  
    //     fetch(`/web_im/${username}`)
    //         .then(response => response.text())
    //         .then(html => {
    //             chatContainer.innerHTML = html;
  
    //             const chatHeader = document.getElementById('chatHeader');
    //             chatHeader.querySelector('h1 a').textContent = `Connect with ${username}`;
  
    //             const recipientUsernameInput = document.getElementById('recipientUsername');
    //             recipientUsernameInput.value = username;
  
    //             const event = new Event('recipientUsernameSet');
    //             document.dispatchEvent(event);
  
    //             // --- Обновление ширины chat-container ---
    //             const contentElement = document.getElementById('content');
    //             function updateChatWidth() {
    //                 const contentRect = contentElement.getBoundingClientRect();
    //                 const availableWidth = window.innerWidth - contentRect.right;
    //                 chatContainer.style.width = availableWidth + 'px';
    //             }
    //             window.addEventListener('resize', updateChatWidth);
    //             updateChatWidth(); 
    //             // --- Конец обновления ширины ---
    //         });
    // }
    // --- Конец функции openChat() ---
    });
    // --- Конец кода для проверки высоты chat-list и открытия чата ---
  });