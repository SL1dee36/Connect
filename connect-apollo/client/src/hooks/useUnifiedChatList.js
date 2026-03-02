import { useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useChatStore } from '../stores/chatStore';

export const useUnifiedChatList = () => {
  const username = useAuthStore(s => s.username);
  const myChats = useProfileStore(s => s.myChats);
  const friends = useProfileStore(s => s.friends);
  const folders = useSettingsStore(s => s.folders);
  const activeFolderId = useSettingsStore(s => s.activeFolderId);
  const pinnedChats = useSettingsStore(s => s.pinnedChats);
  const customChatOrder = useSettingsStore(s => s.customChatOrder);
  const chatPreviews = useChatStore(s => s.chatPreviews ?? {});

  return useMemo(() => {
    let all = [
      ...myChats.map(c => ({
        id: c,
        originalId: c,
        type: 'group',
        name: c,
        avatar: null,
      })),
      ...friends.map(f => {
        const friendUsername = f.username || f;
        const roomId = [username, friendUsername].sort().join('_');
        return {
          id: roomId,
          originalId: friendUsername,
          type: 'dm',
          name: f.display_name || friendUsername,
          avatar: f.avatar_url,
        };
      }),
    ];

    const seen = new Set();
    const unique = all.filter(chat => {
      if (seen.has(chat.id)) return false;
      seen.add(chat.id);
      return true;
    });

    all = unique.map(chat => ({
      ...chat,
      preview: chatPreviews[chat.id] ?? null,
    }));

    if (activeFolderId !== 'all') {
      const currentFolder = folders.find(f => f.id === activeFolderId);
      if (currentFolder) {
        all = all.filter(c => currentFolder.chatIds.includes(c.originalId));
      }
    }

    all.sort((a, b) => {
      const isPinnedA = pinnedChats.includes(a.originalId);
      const isPinnedB = pinnedChats.includes(b.originalId);
      if (isPinnedA !== isPinnedB) return isPinnedA ? -1 : 1;

      const idxA = customChatOrder.indexOf(a.originalId);
      const idxB = customChatOrder.indexOf(b.originalId);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;

      const timeA = a.preview?.timestamp ?? 0;
      const timeB = b.preview?.timestamp ?? 0;
      return timeB - timeA; 
    });

    return all;
  }, [
    myChats,
    friends,
    pinnedChats,
    activeFolderId,
    folders,
    customChatOrder,
    chatPreviews,
    username,
  ]);
};