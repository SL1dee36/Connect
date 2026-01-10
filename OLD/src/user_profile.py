from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, current_app as app
from models import db, User, Post  # Добавляем модель Post
from auth import login_required, get_current_user
from markupsafe import Markup
import os
from PIL import Image
import random, string
import io
from PIL import Image
from io import BytesIO
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

user_profile_bp = Blueprint('user_profile', __name__)

@user_profile_bp.route('/profile/<username>')
def profile(username):
    user = User.query.filter_by(username=username).first_or_404()
    current_user = get_current_user()
    if current_user:
        avatar = current_user.avatar
        is_friend = current_user.is_friend(user)
        friend_request_sent = current_user.has_sent_friend_request_to(user)
        are_friends_of_friends_var = are_friends_of_friends(current_user, user)  # Вычисляем значение are_friends_of_friends
    else:
        avatar = None
        is_friend = False
        friend_request_sent = False
        are_friends_of_friends_var = False  # Если пользователь не авторизован, то are_friends_of_friends = False

    app.logger.debug(f"Профиль пользователя {username} запрошен пользователем {current_user.username if current_user else 'аноним'}")
    app.logger.debug(f"is_friend: {is_friend}, friend_request_sent: {friend_request_sent}")

    return render_template('profile.html', user=user, avatar=avatar, Markup=Markup,
                           current_user=current_user, is_friend=is_friend,
                           friend_request_sent=friend_request_sent, are_friends_of_friends=are_friends_of_friends_var)

@user_profile_bp.route('/profile/<username>/avatar', methods=['POST'])
@login_required
def upload_avatar(username):
    user = User.query.filter_by(username=username).first_or_404()
    current_user = get_current_user()

    # Проверяем, является ли текущий пользователь модератором или администратором,
    # или совпадает ли он с пользователем, чей аватар загружается
    if current_user.role in ('MOD', 'ADM') or current_user == user:
        if request.method == 'POST':
            avatar = request.files.get('avatar')

            if avatar and allowed_file(avatar.filename):
                try:
                    image = Image.open(avatar)
                    image = image.convert("RGB")

                    # Handle orientation EXIF data
                    if hasattr(image, '_getexif'):
                        exif = image._getexif()
                        if exif is not None:
                            orientation = exif.get(0x0112)  # Orientation tag
                            if orientation == 3:
                                image = image.rotate(180, expand=True)
                            elif orientation == 6:
                                image = image.rotate(270, expand=True)
                            elif orientation == 8:
                                image = image.rotate(90, expand=True)

                    # Обрезка до квадрата
                    width, height = image.size
                    size = min(width, height)
                    left = (width - size) / 2
                    top = (height - size) / 2
                    right = (width + size) / 2
                    bottom = (height + size) / 2
                    image = image.crop((left, top, right, bottom))

                    # Изменение размера (опционально)
                    max_size = (512, 512)
                    image.thumbnail(max_size)

                    # Сохранение в WebP
                    output = io.BytesIO()
                    image.save(output, format="webp", quality=85)
                    output.seek(0)

                    filename = f"{user.username}_avatar.webp"
                    with open(os.path.join(app.config['USERS_AVATAR'], filename), "wb") as f:
                        f.write(output.read())

                    user.avatar = filename
                    db.session.commit()
                    flash('Аватар успешно обновлен!', 'success')

                except Exception as e:
                    flash(f'Ошибка при обработке аватара: {e}', 'error')

    else:
        flash('У вас нет прав для изменения аватара этого пользователя.', 'danger')

    return redirect(url_for('user_profile.profile', username=username))

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def are_friends_of_friends(user1, user2):
    user1_friends = set(user1.friends)
    user2_friends = set(user2.friends)
    common_friends = user1_friends.intersection(user2_friends)
    return len(common_friends) > 0

@user_profile_bp.route('/send_friend_request/<username>')
@login_required
def send_friend_request(username):
    current_user = get_current_user()
    if current_user:
        recipient = User.query.filter_by(username=username).first_or_404()
        if current_user.has_sent_friend_request_to(recipient) or current_user.is_friend(recipient):
            flash('Вы уже отправили запрос на добавление в друзья или являетесь другом этого пользователя', 'warning')
        else:
            current_user.send_friend_request(recipient)
            flash(f'Запрос в друзья отправлен пользователю {username}', 'info')
            app.logger.info(f"Пользователь {current_user.username} отправил запрос в друзья пользователю {username}")
    return redirect(url_for('user_profile.profile', username=username))

@user_profile_bp.route('/profile/<username>/save_settings', methods=['POST'])
@login_required
def save_settings(username):
    user = User.query.filter_by(username=username).first_or_404()
    current_user = get_current_user()

    if current_user.role in ('MOD', 'ADM') or current_user == user:
        data = request.form.to_dict()

        if data.get('fullname'):
            user.fullname = data['fullname']

        if data.get('newEmail') and data.get('password'):
            if check_password_hash(user.password, data['password']):
                user.mail = data['newEmail']
            else:
                return jsonify({'error': 'Неверный пароль'}), 400

        if data.get('currentPassword') and data.get('newPassword1') and data.get('newPassword2'):
            if check_password_hash(user.password, data['currentPassword']):
                if data['newPassword1'] == data['newPassword2']:
                    user.password = generate_password_hash(data['newPassword1'])
                else:
                    return jsonify({'error': 'Новые пароли не совпадают'}), 400
            else:
                return jsonify({'error': 'Неверный текущий пароль'}), 400

        if data.get('messageSettings'):
            user.message_settings = data['messageSettings']

        if 'avatar' in request.files:
            avatar = request.files['avatar']
            if avatar and allowed_file(avatar.filename):
                try:
                    image = Image.open(avatar)
                    image = image.convert("RGB")

                    if hasattr(image, '_getexif'):
                        exif = image._getexif()
                        if exif is not None:
                            orientation = exif.get(0x0112)
                            if orientation == 3:
                                image = image.rotate(180, expand=True)
                            elif orientation == 6:
                                image = image.rotate(270, expand=True)
                            elif orientation == 8:
                                image = image.rotate(90, expand=True)

                    width, height = image.size
                    size = min(width, height)
                    left = (width - size) / 2
                    top = (height - size) / 2
                    right = (width + size) / 2
                    bottom = (height + size) / 2
                    image = image.crop((left, top, right, bottom))

                    max_size = (512, 512)
                    image.thumbnail(max_size)

                    output = io.BytesIO()
                    image.save(output, format="webp", quality=85)
                    output.seek(0)

                    filename = f"{user.username}_avatar.webp"
                    with open(os.path.join(app.config['USERS_AVATAR'], filename), "wb") as f:
                        f.write(output.read())

                    user.avatar = filename

                except Exception as e:
                    app.logger.error(f"Ошибка при обработке аватара: {e}")
                    return jsonify({'error': 'Ошибка при обработке аватара'}), 500

        db.session.commit()
        app.logger.info(f"Пользователь {current_user.username} обновил настройки профиля")
        return jsonify({'message': 'Настройки успешно сохранены'}), 200
    else:
        return jsonify({'error': 'У вас нет прав для изменения настроек этого пользователя.'}), 403

@user_profile_bp.route('/accept_friend_request/<username>')
@login_required
def accept_friend_request(username):
    current_user = get_current_user()
    if current_user:
        sender = User.query.filter_by(username=username).first_or_404()
        if current_user.has_received_friend_request_from(sender):
            current_user.accept_friend_request(sender)
            flash(f'Вы приняли запрос в друзья от {username}', 'success')
        else:
            flash('Запрос на добавление в друзья не найден', 'warning')
    return redirect(url_for('user_profile.profile', username=username))

@user_profile_bp.route('/reject_friend_request/<username>')
@login_required
def reject_friend_request(username):
    current_user = get_current_user()
    if current_user:
        sender = User.query.filter_by(username=username).first_or_404()
        if current_user.has_received_friend_request_from(sender):
            current_user.reject_friend_request(sender)  # Implement this method in your User model
            flash(f'Вы отклонили запрос в друзья от {username}', 'info')
        else:
            flash('Запрос на добавление в друзья не найден', 'warning')
    return redirect(url_for('user_profile.profile', username=username))

def compress_image(image_data):
    img = Image.open(BytesIO(image_data))

    # Convert to RGB mode if necessary
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Reduce image quality without resizing
    output_buffer = BytesIO()
    img.save(output_buffer, format="JPEG", optimize=True, quality=85)
    compressed_image_data = output_buffer.getvalue()
    return compressed_image_data


@user_profile_bp.route('/profile/<username>/create_post', methods=['POST'])
@login_required
def create_post(username):
    current_user = get_current_user()
    if current_user.username != username:
        return jsonify({'error': 'У вас нет прав для создания поста от имени этого пользователя'}), 403

    text = request.form.get('text')
    image = request.files.get('image')
    video = request.files.get('video')

    if not any([text, image, video]):
        return jsonify({'error': 'Необходимо ввести текст, загрузить изображение или видео'}), 400

    post = Post(user_id=current_user.id, text=text)

    if image:
        if not allowed_file(image.filename):
            return jsonify({'error': 'Неподдерживаемый тип файла изображения'}), 400

        random_string = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(8))
        filename = f"{current_user.username}_{random_string}.webp"
        filepath = os.path.join(app.config['USERS_IMAGES'], filename)

        compressed_image_data = compress_image(image.read())
        with open(filepath, 'wb') as f:
            f.write(compressed_image_data)

        post.image = filename

    if video:
        if not allowed_file(video.filename):
            return jsonify({'error': 'Неподдерживаемый тип файла видео'}), 400

        random_string = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(8))
        filename = f"{current_user.username}_{random_string}.mp4"
        filepath = os.path.join(app.config['USERS_VIDEOS'], filename)

        video.save(filepath)
        post.video = filename

    db.session.add(post)
    db.session.commit()

    return jsonify({'message': 'Пост успешно создан'}), 201


@user_profile_bp.route('/profile/<username>/delete_post/<int:post_id>', methods=['DELETE'])
@login_required
def delete_post(username, post_id):
    current_user = get_current_user()
    post = Post.query.get_or_404(post_id)

    if current_user.id != post.user_id:
        return jsonify({'error': 'У вас нет прав на удаление этого поста'}), 403

    # Сначала удаляем запись из базы данных
    db.session.delete(post)
    db.session.commit()

    # После удаления записи, удаляем файлы
    if post.image:
        image_path = os.path.join(app.config['USERS_IMAGES'], post.image)
        if os.path.exists(image_path):
            os.remove(image_path)

    #if post.video:
    #    video_path = os.path.join(app.config['USERS_VIDEOS'], post.video)
    #    if os.path.exists(video_path):
    #        os.remove(video_path)

    # Сначала удаляем запись из базы данных
    db.session.delete(post)
    db.session.commit()

    return jsonify({'message': 'Пост успешно удален'}), 200