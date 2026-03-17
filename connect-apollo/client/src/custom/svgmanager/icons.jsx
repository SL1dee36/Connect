const IconClock = () => (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft: 4, display: 'inline-block', verticalAlign: 'middle'}}><path fill="currentColor" d="M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18Zm11-9c0 6.075-4.925 11-11 11S1 18.075 1 12S5.925 1 12 1s11 4.925 11 11Zm-8 4.414l-4-4V5.5h2v6.086L16.414 15L15 16.414Z"/></svg>);
const IconCheck = () => (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft: 4, display: 'inline-block', verticalAlign: 'middle'}}><path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19L21 7l-1.4-1.4L9 16.2z"/></svg>);
const IconReply = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path fill="currentColor" d="M18 8H8V6H6v2H4v2h2v2h2v-2h10v10h2V8h-2zM8 12v2h2v-2H8zm0-6V4h2v2H8z"/></svg>);
const IconCopy = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path fill="currentColor" d="M4 2h11v2H6v13H4V2zm4 4h12v16H8V6zm2 2v12h8V8h-8z"/></svg>);
const IconTrash = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M5 3H3v18h18V3H5zm14 2v14H5V5h14zm-3 6H8v2h8v-2z"/></svg>);
const IconBell = ({ hasUnread }) => (<div style={{ position: 'relative', cursor: 'pointer', display: 'flex' }}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M14 4V2h-4v2H5v2h14V4h-5zm5 12H5v-4H3v6h5v4h2v-4h4v2h-4v2h6v-4h5v-6h-2V6h-2v8h2v2zM5 6v8h2V6H5z"/></svg>{hasUnread && (<span style={{position: 'absolute', top: -2, right: -2, width: 8, height: 8, background: '#ff4d4d', borderRadius: '50%', border: '2px solid #1e1e1e'}}/>)}</div>);
const IconShare = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M22 2h-2v2h2v12h-2v2h2v-2h2V4h-2V2ZM2 4H0v12h2v2h2v-2H2V4Zm0 0V2h2v2H2Zm4 2H4v8h2V6Zm0 0V4h2v2H6Zm4 0h4v2h-4V6Zm0 6H8V8h2v4Zm4 0h-4v2H8v4H6v4h2v-4h2v-4h4v4h2v4h2v-4h-2v-4h-2v-2Zm0 0h2V8h-2v4Zm6-6h-2V4h-2v2h2v8h2V6Z"/></svg>);
const IconBug = () => (<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path fill="currentColor" d="M8 2h2v4h4V2h2v4h2v3h2v2h-2v2h4v2h-4v2h2v2h-2v3H6v-3H4v-2h2v-2H2v-2h4v-2H4V9h2V6h2V2Zm8 6H8v3h8V8Zm-5 5H8v7h3v-7Zm2 7h3v-7h-3v7ZM4 9H2V7h2v2Zm0 10v2H2v-2h2Zm16 0h2v2h-2v-2Zm0-10V7h2v2h-2Z"/></svg>);
const IconShield = () => (<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path fill="currentColor" d="M22 2H2v12h2V4h16v10h2V2zM6 14H4v2h2v-2zm0 2h2v2h2v2H8v-2H6v-2zm4 4v2h4v-2h2v-2h-2v2h-4zm10-6h-2v2h-2v2h2v-2h2v-2z"/></svg>);
const IconMic = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.9975 4H15V2H12.9975H11.0025H9V4H11.0025H12.9975Z M12.9975 15H15V13H12.9975H11.0025H9V15H11.0025H12.9975Z M13.33 18H16V16H13.33H10.67H8V18H10.67H13.33ZM13.33 22H16V20H13.33H10.67H8V22H10.67H13.33ZM15 6.24895V7.37553V8.49789V9.62447V10.7511V11.8734V13H17V11.8734V10.7511V9.62447V8.49789V7.37553V6.24895V5.12236V4H15V5.12236V6.24895ZM6 11H4V12.5V14H6V12.5V11ZM18 11V12.5V14H20V12.5V11H18ZM8 14H6V16H8V14ZM18 14H16V16H18V14ZM7 6.24895V7.37553V8.49789V9.62447V10.7511V11.8734V13H9V11.8734V10.7511V9.62447V8.49789V7.37553V6.24895V5.12236V4H7V5.12236V6.24895ZM11 18.4998V18.7501V18.9995V19.2499V19.5002V19.7496V20H13V19.7496V19.5002V19.2499V18.9995V18.7501V18.4998V18.2494V18H11V18.2494V18.4998Z"/></svg>);
const IconPaperclip = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M5 5h16v10H7V9h10v2H9v2h10V7H5v10h14v2H3V5h2z"/> </svg>);
const IconPin = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M11 4h2v8h2v2h-2v2h-2v-2H9v-2h2V4zm-2 8H7v-2h2v2zm6 0v-2h2v2h-2zM4 18h16v2H4v-2z"/></svg>);
const IconFolder = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h8v2h10v14H2V4h2zm16 4H10V6H4v12h16V8z"/></svg>);
const IconCheckCircle = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5l1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>);
const IconDrag = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M20 6V4H4v2h16zm0 14v-2H4v2h16zM17 8v8h-2V8h2zm-8 6v-4h6V8H7v8h8v-2H9z" /></svg>);
const IconCamera = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M2 5h14v4h2V7h2V5h2v14h-2v-2h-2v-2h-2v4H2V5zm2 12h10V7H4v10z"/></svg>);
const IconMessage = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20 2H2v20h2V4h16v12H6v2H4v2h2v-2h16V2h-2zM6 7h12v2H6V7zm8 4H6v2h8v-2z"/></svg>);
const IconCall = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>);
const IconLightning = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>);
const IconMore = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>);
const IconPlus = () => (<svg id="plus-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4z"/></svg>);
const IconBack = () => (<svg xmlns="http://www.w3.org/2000/svg" width="32" height="26" viewBox="0 0 24 24"><path fill="currentColor" d="M16 5v2h-2V5h2zm-4 4V7h2v2h-2zm-2 2V9h2v2h-2zm0 2H8v-2h2v2zm2 2v-2h-2v2h2zm0 0h2v2h-2v-2zm4 4v-2h-2v2h2z"/></svg>);
const IconPlay = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>);
const IconMenu = () => (<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm16 5H4v2h16v-2z"/></svg>);
const IconInfo = () => (<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M6 3h14v2h2v6h-2v8h-2V5H6V3zm8 14v-2H6V5H4v10H2v4h2v2h14v-2h-2v-2h-2zm0 0v2H4v-2h10zM8 7h8v2H8V7zm8 4H8v2h8v-2z"/></svg>);
const IconAddToGroup = () => (<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M18 2h-6v2h-2v6h2V4h6V2zm0 8h-6v2h6v-2zm0-6h2v6h-2V4zM7 16h2v-2h12v2H9v4h12v-4h2v6H7v-6zM3 8h2v2h2v2H5v2H3v-2H1v-2h2V8z"/></svg>);
const IconSend = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>);
const IconLock = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2c-4.42 0-8 3.58-8 8v4h16v-4c0-4.42-3.58-8-8-8zm4 12H8v-4c0-2.21 1.79-4 4-4s4 1.79 4 4v4z"/></svg>);
const IconGroup = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M5 3h14v2H5V3zm0 16H3V5h2v14zm14 0v2H5v-2h14zm0 0h2V5h-2v14zM10 8H8v2h2V8zm4 0h2v2h-2V8zm-5 6v-2H7v2h2zm6 0v2H9v-2h6zm0 0h2v-2h-2v2z"/></svg>);
const IconError = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>);
const IconNewGroup = () => (<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path fill="currentColor" d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4z"/></svg>);
const IconSearchGroup = () => (<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path fill="currentColor" d="M6 2h8v2H6V2zM4 6V4h2v2H4zm0 8H2V6h2v8zm2 2H4v-2h2v2zm8 0v2H6v-2h8zm2-2h-2v2h2v2h2v2h2v2h2v-2h-2v-2h-2v-2h-2v-2h-2zm0-8h2v8h-2V6zm0 0V4h-2v2h2z"/></svg>);
const IconSearchPeople = () => (<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path fill="currentColor" d="M18 2h-6v2h-2v6h2V4h6V2zm0 8h-6v2h6v-2zm0-6h2v6h-2V4zM7 16h2v-2h12v2H9v4h12v-4h2v6H7v-6zM3 8h2v2h2v2H5v2H3v-2H1v-2h2V8z"/></svg>);
const IconProfileStatus = () => (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path fill="currentColor" d="M4 4h16v12H8V8h8v6h2V6H6v12h14v2H4V4zm10 10v-4h-4v4h4z"/></svg>);
const IconAvatar1 = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M4 4H2v16h20V4H4zm16 2v12H4V6h16zM8 8H6v2h2V8zm4 0h4v2h-4V8zm-2 2h2v4h-2v-4zm6 4h2v-4h-2v4zm0 0h-4v2h4v-2z"/></svg>);
const IconAvatar2 = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M9 2h2v2H9V2zm4 4V4h-2v2H9v2H7v2H5v2H3v2h2v2h2v2h2v2h2v2h2v-2h2v-2h2v-2h2v6h2V12h-2v-2h-2V8h-2V6h-2zm0 0v2h2v2h2v2h2v2H5v-2h2v-2h2V8h2V6h2z"/></svg>);
const IconAvatar3 = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M17 4h2v10h-2V4zm0 12h-2v2h2v2h2v-2h2v-2h-4zm-4-6h-2v10h2V10zm-8 2H3v2h2v6h2v-6h2v-2H5zm8-8h-2v2H9v2h6V6h-2V4zM5 4h2v6H5V4z"/></svg>);
const IconAvatar4 = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 1h2v8h8v4h-2v-2h-8V5h-2V3h2V1zM8 7V5h2v2H8zM6 9V7h2v2H6zm-2 2V9h2v2H4zm10 8v2h-2v2h-2v-8H2v-4h2v2h8v6h2zm2-2v2h-2v-2h2zm2-2v2h-2v-2h2zm0 0h2v-2h-2v2z"/></svg>);
const IconSettings = () => (<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24" fill="currentColor"><path fill="currentColor" d="M4 4h16v12H8V8h8v6h2V6H6v12h14v2H4V4zm10 10v-4h-4v4h4z"/></svg>);
const IconPhone = () => (<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24"><path fill="currentColor" d="M1 2h8.58l1.487 6.69l-1.86 1.86a14.08 14.08 0 0 0 4.243 4.242l1.86-1.859L22 14.42V23h-1a19.91 19.91 0 0 1-10.85-3.196a20.101 20.101 0 0 1-5.954-5.954A19.91 19.91 0 0 1 1 3V2Zm2.027 2a17.893 17.893 0 0 0 2.849 8.764a18.102 18.102 0 0 0 5.36 5.36A17.892 17.892 0 0 0 20 20.973v-4.949l-4.053-.9l-2.174 2.175l-.663-.377a16.073 16.073 0 0 1-6.032-6.032l-.377-.663l2.175-2.174L7.976 4H3.027Z"/></svg>);
const IconBio = () => (<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24"><path fill="currentColor" d="M21 1v22H3V1h18Zm-8 2v6.5l-3-2.25L7 9.5V3H5v18h14V3h-6ZM9 3v2.5l1-.75l1 .75V3H9Zm-2 9h10v2H7v-2Zm0 4h8v2H7v-2Z"/></svg>);
const IconAddFriend = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M18 2h-6v2h-2v6h2V4h6V2zm0 8h-6v2h6v-2zm0-6h2v6h-2V4zM7 16h2v-2h12v2H9v4h12v-4h2v6H7v-6zM3 8h2v2h2v2H5v2H3v-2H1v-2h2V8z"/></svg>);
const IconRemoveFriend = () => (<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24"><path fill="currentColor" d="m8.4 17l3.6-3.6l3.6 3.6l1.4-1.4l-3.6-3.6L17 8.4L15.6 7L12 10.6L8.4 7L7 8.4l3.6 3.6L7 15.6L8.4 17ZM5 21q-.825 0-1.413-.588T3 19V5q0-.825.588-1.413T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.588 1.413T19 21H5Zm0-2h14V5H5v14ZM5 5v14V5Z"/></svg>);
const IconBlockUser = () => (<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="currentColor"><path fill="currentColor" d="M12 22q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35-3.175 2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Zm0-2q3.35 0 5.675-2.325T20 12q0-1.35-.438-2.6T18.3 7.1L7.1 18.3q1.05.825 2.3 1.263T12 20Zm-6.3-3.1L16.9 5.7q-1.05-.825-2.3-1.262T12 4Q8.65 4 6.325 6.325T4 12q0 1.35.437 2.6T5.7 16.9Z"/></svg>);

export default {
    IconClock,
    IconCheck,
    IconReply,
    IconCopy,
    IconTrash,
    IconBell,
    IconShare,
    IconBug,
    IconShield,
    IconMic,
    IconPaperclip,
    IconPin,
    IconFolder,
    IconCheckCircle,
    IconDrag,
    IconCamera,
    IconMessage,
    IconCall,
    IconLightning,
    IconMore,
    IconPlus,
    IconBack,
    IconPlay,
    IconMenu,
    IconInfo,
    IconAddToGroup,
    IconSend,
    IconLock,
    IconGroup,
    IconError,
    IconNewGroup,
    IconSearchGroup,
    IconSearchPeople,
    IconProfileStatus,
    IconAvatar1,
    IconAvatar2,
    IconAvatar3,
    IconAvatar4,
    IconSettings,
    IconPhone,
    IconBio,
    IconAddFriend,
    IconRemoveFriend,
    IconBlockUser
};