# application.py
from flask import Flask, request, render_template, redirect, url_for, send_from_directory, session, flash, jsonify
from models import db, User, Message
import os
from markupsafe import Markup

# Импортируем функции из других модулей
from auth import auth_bp, get_current_user, login_required
from user_profile import user_profile_bp  # Измените имя файла здесь
from messenger import messenger_bp
from feed import feed_bp

application = Flask(__name__)
application.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///inConnect.db'
application.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

application.config['USERS_FOLDER'] = os.path.join(application.root_path, 'static/users')
application.config['USERS_AVATAR'] = os.path.join(application.root_path, 'static/users/avatars')
application.config['USERS_VIDEOS'] = os.path.join(application.root_path, 'static/users/videos')
application.config['USERS_IMAGES'] = os.path.join(application.root_path, 'static/users/images')

application.config['SYSTEM_IMAGES'] = os.path.join(application.root_path, 'static/img')
application.config['SYSTEM_CSS'] = os.path.join(application.root_path, 'static/css')

application.config['MAX_CONTENT_LENGTH'] = 30 * 1024 * 1024  # 30MB

application.secret_key = '!87T23GDWE'

application.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'svg'} 

db.init_app(application)

# Регистрируем blueprints
application.register_blueprint(auth_bp)
application.register_blueprint(user_profile_bp)
application.register_blueprint(messenger_bp)
application.register_blueprint(feed_bp)


@application.route('/static/css/<path:filename>')
def styles(filename):
    return send_from_directory(application.config['SYSTEM_CSS'], filename)


@application.route('/static/img/<path:filename>')
def serve_icons(filename):
    return send_from_directory(application.config['SYSTEM_IMAGES'], filename)


@application.route('/static/users/avatars/<path:filename>')
def serve_avatars(filename):
    return send_from_directory(application.config['USERS_AVATAR'], filename)


@application.route('/')
def index():
    current_user = get_current_user()

    chats = []
    if current_user:
        # Получаем все сообщения, где current_user является отправителем или получателем
        all_messages = Message.query.filter(
            (Message.sender_id == current_user.id) | (Message.recipient_id == current_user.id)
        ).all()

        # Создаем словарь для хранения пользователей, с которыми есть сообщения
        users_with_messages = set()
        for message in all_messages:
            users_with_messages.add(message.sender_id if message.sender_id != current_user.id else message.recipient_id)

        # Получаем информацию о чатах для каждого пользователя
        for user_id in users_with_messages:
            user = User.query.get(user_id)
            last_message = Message.query.filter(
                ((Message.sender_id == current_user.id) & (Message.recipient_id == user_id)) |
                ((Message.sender_id == user_id) & (Message.recipient_id == current_user.id))
            ).order_by(Message.timestamp.desc()).first()

            unread_count = Message.query.filter(
                Message.sender_id == user_id,
                Message.recipient_id == current_user.id,
                Message.read == False
            ).count()

            chats.append({
                'user': user,
                'last_message': last_message,
                'unread_count': unread_count
            })

    return render_template('index.html', Markup=Markup, current_user=current_user, Message=Message, chats=chats)


@application.route('/search_friends', methods=['POST'])
def search_friends():
    current_user = get_current_user()
    search_query = request.json.get('query')

    if current_user and search_query:
        users = User.query.filter(User.username.ilike(f'%{search_query}%')).all()

        users_data = [{
            'username': user.username,
            'avatar_url': url_for('serve_avatars', filename=user.avatar) if user.avatar and user.avatar != 'None' else url_for('serve_icons', filename='rotatingdandelion.gif'),
            'profile_url': url_for('user_profile.profile', username=user.username)
        } for user in users]

        return jsonify(users_data)
    else:
        return jsonify([])


@application.route('/web_index')
def web_index():
    current_user = get_current_user()

    chats = []
    if current_user:
        # Получаем все сообщения, где current_user является отправителем или получателем
        all_messages = Message.query.filter(
            (Message.sender_id == current_user.id) | (Message.recipient_id == current_user.id)
        ).all()

        # Создаем словарь для хранения пользователей, с которыми есть сообщения
        users_with_messages = set()
        for message in all_messages:
            users_with_messages.add(message.sender_id if message.sender_id != current_user.id else message.recipient_id)

        # Получаем информацию о чатах для каждого пользователя
        for user_id in users_with_messages:
            user = User.query.get(user_id)
            last_message = Message.query.filter(
                ((Message.sender_id == current_user.id) & (Message.recipient_id == user_id)) |
                ((Message.sender_id == user_id) & (Message.recipient_id == current_user.id))
            ).order_by(Message.timestamp.desc()).first()

            unread_count = Message.query.filter(
                Message.sender_id == user_id,
                Message.recipient_id == current_user.id,
                Message.read == False
            ).count()

            chats.append({
                'user': user,
                'last_message': last_message,
                'unread_count': unread_count
            })

    return render_template('web/web_index.html', Markup=Markup, current_user=current_user, Message=Message, chats=chats)


if __name__ == '__main__':
    with application.app_context():
        db.create_all()
    application.run(debug=True)