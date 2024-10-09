from flask_sqlalchemy import SQLAlchemy
import datetime
from datetime import datetime, timezone
import re

db = SQLAlchemy()

# Таблица для запросов на дружбу
class FriendRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.now(timezone.utc))

    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_friend_requests')
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='received_friend_requests')

friends = db.Table('friends',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('friend_id', db.Integer, db.ForeignKey('user.id'), primary_key=True)
)

# Table for messages
class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    read = db.Column(db.Boolean, default=False)

    sender = db.relationship('User', foreign_keys=[sender_id], backref='messages_sent')
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='messages_received')

    def to_dict(self):
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'recipient_id': self.recipient_id,
            'text': self.text,
            'timestamp': self.timestamp.isoformat(),
            'read': self.read,
            'sender': self.sender.to_dict()  # Добавляем данные отправителя
        }



class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    fullname = db.Column(db.String(255), nullable=False)

    blocked = db.Column(db.Boolean, default=False)  # Добавляем поле для блокировки
    validated_profile = db.Column(db.Boolean, default=False)
    role = db.Column(db.String(20), default='user') # Helper (MOD) | Administartor (ADM)

    message_settings = db.Column(db.String(20), default='friends')
    mail = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    avatar = db.Column(db.String(255), default=r'newibe.png')
    confirmation_code = db.Column(db.String(6), nullable=True)
    confirmed = db.Column(db.Boolean, default=False)
    failed_login_attempts = db.Column(db.Integer, default=0)

    def __init__(self, username, **kwargs):
        super(User, self).__init__(**kwargs)
        self.username = username
        self.fullname = username 

    def to_dict(self):  # Добавляем метод to_dict() для User
        return {
            'id': self.id,
            'username': self.username,
            'avatar': self.avatar
        }
    
    def can_message(self, recipient):
        """
        Проверяет, может ли текущий пользователь отправить сообщение 
        пользователю recipient, учитывая настройки recipient.
        """
        if self.is_friend(recipient):
            return True  # Друзья всегда могут писать друг другу

        if recipient.message_settings == 'all':
            return True  # Если настройки recipient - "все", то можно писать

        if recipient.message_settings == 'friends_of_friends':
            # Проверяем, являются ли пользователи друзьями друзей
            for friend in self.friends:
                if recipient.is_friend(friend):
                    return True

        # Проверяем, отправлял ли текущий пользователь или recipient сообщения друг другу
        if Message.query.filter(
            (Message.sender_id == self.id) & (Message.recipient_id == recipient.id) |
            (Message.sender_id == recipient.id) & (Message.recipient_id == self.id)
        ).first():
            return True  # Если отправлял, то можно писать

        return False  # В остальных случаях писать нельзя

    # Relationships for friendships
    friends = db.relationship('User', secondary='friends',
                              primaryjoin='User.id == friends.c.user_id',
                              secondaryjoin='User.id == friends.c.friend_id',
                              backref=db.backref('friends_with', lazy='dynamic'))


    def send_friend_request(self, user):
        if not self.is_friend(user) and not self.has_sent_friend_request_to(user):
            print(f"Добавление в друзья: {self.username} -> {user.username}")
            friend_request = FriendRequest(sender=self, recipient=user)
            db.session.add(friend_request)
            db.session.commit()


    def accept_friend_request(self, user):
        # Найдем запрос на дружбу от конкретного пользователя
        friend_request = next((fr for fr in self.received_friend_requests if fr.sender_id == user.id), None)
        
        if friend_request:
            # Добавляем друга
            self.friends.append(user)
            user.friends.append(self)
            
            # Удаляем запрос на дружбу после принятия
            db.session.delete(friend_request)
            db.session.commit()


    def reject_friend_request(self, user):
        friend_request = self.received_friend_requests.filter(FriendRequest.sender_id == user.id).first()
        if friend_request:
            db.session.delete(friend_request)
            db.session.commit()

    def is_friend(self, user):
        result = user in self.friends and self in user.friends
        print(f"Проверка дружбы: {self.username} -> {user.username}, результат: {result}")
        return result

    
    def has_sent_friend_request_to(self, user):
        return FriendRequest.query.filter_by(sender_id=self.id, recipient_id=user.id).first() is not None


    def has_received_friend_request_from(self, user):
        return FriendRequest.query.filter_by(sender_id=user.id, recipient_id=self.id).first() is not None
    
class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    text = db.Column(db.String(1000), nullable=True)
    image = db.Column(db.String(255), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.now(timezone.utc))

    user = db.relationship('User', backref='posts')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'text': self.text,
            'image': self.image,
            'timestamp': self.timestamp.isoformat(),
            'user': self.user.to_dict()
        }