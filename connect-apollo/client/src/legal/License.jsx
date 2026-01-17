import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Legal.css';

const License = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page-container">
      <div className="legal-content">
        <div className="legal-header">
          <button className="legal-back-btn" onClick={() => navigate(-1)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8l8 8l1.41-1.41L7.83 13H20v-2z"/></svg>
            Назад
          </button>
          <h1 className="legal-title">Лицензия и Авторские права</h1>
        </div>
        
        <div className="legal-body">
          <h3>Лицензия конечного пользователя</h3>
          <p>Данное программное обеспечение "Connect" предоставляется вам на условиях ограниченной, неисключительной, непередаваемой лицензии исключительно для личного использования.</p>

          <h3>Интеллектуальная собственность</h3>
          <p>Все права на дизайн, исходный код, логотипы и графические элементы приложения принадлежат разработчикам Connect. Копирование, модификация или реверс-инжиниринг приложения без письменного разрешения запрещены.</p>

          <h3>Сторонние компоненты</h3>
          <p>В приложении используются следующие библиотеки с открытым исходным кодом:</p>
          <ul>
            <li><strong>React</strong> - MIT License</li>
            <li><strong>Socket.io</strong> - MIT License</li>
            <li><strong>SQLite</strong> - Public Domain</li>
            <li><strong>Sharp</strong> - Apache 2.0 License</li>
          </ul>
          <p>Полные тексты лицензий сторонних компонентов доступны в репозиториях соответствующих проектов.</p>

          <h3>Контактная информация</h3>
          <p>По вопросам лицензирования и авторских прав обращайтесь по адресу: nazaryannnn36@gmail.com</p>
        </div>
      </div>
    </div>
  );
};

export default License;