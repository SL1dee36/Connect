# messenger.py
from flask import Flask, request, render_template, redirect, url_for, send_from_directory, session, flash, jsonify
from flask import Blueprint, render_template, request, jsonify,Response
from models import db, User, Message
from auth import login_required, get_current_user
import logging

# -------
import time
from datetime import datetime, timezone
# -------


messenger_bp = Blueprint('messenger', __name__)

# Настройка логгера для вывода в консоль
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@messenger_bp.route('/im/<username>')
@login_required
def im(username):
    current_user = get_current_user() 
    recipient = User.query.filter_by(username=username).first_or_404()

    # Проверка, можно ли писать пользователю
    if not current_user.can_message(recipient):
        flash('Вы не можете написать сообщение этому пользователю.', 'warning')
        return redirect(url_for('index'))

    messages = Message.query.filter(
        ((Message.sender_id == current_user.id) & (Message.recipient_id == recipient.id)) |
        ((Message.sender_id == recipient.id) & (Message.recipient_id == current_user.id))
    ).order_by(Message.timestamp).all()

    for message in messages:
        if message.sender_id == recipient.id and not message.read:
            message.read = True
    db.session.commit()

    return render_template('im.html', current_user=current_user, recipient=recipient, messages=messages)

@messenger_bp.route('/send_message', methods=['POST'])
@login_required
def send_message():
    current_user = get_current_user()
    logger.info(f"Пользователь {current_user.username} пытается отправить сообщение.")

    recipient_username = request.form.get('recipient_username')
    recipient = User.query.filter_by(username=recipient_username).first()

    if not recipient:
        logger.warning(f"Пользователь {recipient_username} не найден.")
        return jsonify({'error': 'Пользователь не найден'}), 404

    text = request.form.get('message')
    if not text:
        logger.warning(f"Пользователь {current_user.username} пытается отправить пустое сообщение.")
        return jsonify({'error': 'Сообщение не может быть пустым'}), 400

    # Создание и сохранение сообщения с UTC timestamp
    new_message = Message(sender_id=current_user.id, recipient_id=recipient.id, text=text, timestamp=datetime.now(timezone.utc))
    db.session.add(new_message)
    db.session.commit()

    # Convert timestamp to ISO 8601 format with explicit timezone offset
    timestamp_iso = new_message.timestamp.astimezone(timezone.utc).isoformat()  # Force UTC timezone

    logger.info(f"Пользователь {current_user.username} успешно отправил сообщение пользователю {recipient_username}: {text}")

    return jsonify({'status': 'success', 'message': 'Сообщение отправлено', 'data': {
        'sender': current_user.username,
        'recipient': recipient.username,
        'text': text,
        'timestamp': timestamp_iso  # Send ISO 8601 timestamp with timezone
    }}), 200

@messenger_bp.route('/get_new_messages', methods=['GET'])
@login_required
def get_new_messages():
    current_user = get_current_user()
    recipient_username = request.args.get('recipient_username')
    current_user_id = request.args.get('current_user_id') 

    recipient = User.query.filter_by(username=recipient_username).first()

    if not recipient:
        return jsonify({'error': 'Пользователь не найден'}), 404

    # Проверяем, совпадает ли current_user_id с id текущего пользователя
    if current_user_id is not None and int(current_user_id) != current_user.id:
        return jsonify({'error': 'Ошибка авторизации'}), 403

    # Получаем непрочитанные сообщения от recipient для current_user
    new_messages = Message.query.filter_by(sender_id=recipient.id, recipient_id=current_user.id, read=False).all()

    # Помечаем новые сообщения как прочитанные
    for message in new_messages:
        message.read = True
    db.session.commit()

    return jsonify({'messages': [message.to_dict() for message in new_messages]}), 200