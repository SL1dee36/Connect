document.addEventListener('DOMContentLoaded', () => {
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
});