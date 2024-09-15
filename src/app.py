from flask import Flask, request, render_template, redirect, url_for, send_from_directory, session, flash, jsonify

from models import db, User
import os
from moviepy.editor import VideoFileClip
from PIL import Image
import random
import string
from markupsafe import Markup
from werkzeug.utils import secure_filename
import base64
from flask import current_app as app
from fuzzywuzzy import fuzz, process
from os import system as s

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///inConnect.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.config['USERS_FOLDER'] = os.path.join(app.root_path, 'static/users')
app.config['USERS_AVATAR'] = os.path.join(app.root_path, 'static/users/avatars')
app.config['USERS_VIDEOS'] = os.path.join(app.root_path, 'static/users/videos')
app.config['USERS_IMAGES'] = os.path.join(app.root_path, 'static/users/images')

app.config['SYSTEM_IMAGES'] = os.path.join(app.root_path, 'static/img')
app.config['SYSTEM_VIDEOS'] = os.path.join(app.root_path, 'static/vid')
app.config['SYSTEM_CSS']    = os.path.join(app.root_path, 'static/css')


app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024 * 1024  # 8GB

app.secret_key   = '!87T23GDWE'
admin_secret_key = '!87T23GDWE'
db.init_app(app)

app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'mp4'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def get_current_user():
    user_id = session.get('user_id')
    if user_id is not None:
        return User.query.get(user_id)
    return None


@app.route('/', methods=['GET', 'POST'])
def index():
    current_user = get_current_user()
    return render_template('index.html', Markup=Markup, current_user=current_user)

@app.route('/static/css/<path:filename>')
def styles(filename):
    return send_from_directory(app.config['SYSTEM_CSS'], filename)

@app.route('/static/img/<path:filename>')
def serve_icons(filename):
    return send_from_directory(app.config['SYSTEM_IMAGES'], filename)

@app.route('/static/users/avatars/<path:filename>')
def serve_avatars(filename):
    return send_from_directory(app.config['USERS_AVATAR'], filename)



@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and user.password == password:
            session['logged_in'] = True
            session['user_id'] = user.id
            return redirect(url_for('index'))
        else:
            return render_template('login.html', error="Неверный логин или пароль")
    current_user = get_current_user()
    return render_template('login.html', current_user=current_user)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if User.query.filter_by(username=username).first():
            return render_template('register.html', error="Пользователь с таким именем уже существует")
        new_user = User(username=username, password=password)
        db.session.add(new_user)
        db.session.commit()
        return redirect(url_for('login'))
    current_user = get_current_user()
    return render_template('register.html', current_user=current_user)

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    session.pop('user_id', None)
    return redirect(url_for('index'))




@app.route('/profile/<username>')
def profile(username):
    user = User.query.filter_by(username=username).first_or_404()
    current_user = get_current_user()
    if current_user:
        avatar = current_user.avatar
    else:
        avatar = None
    return render_template('profile.html', user=user, avatar=avatar, Markup=Markup,
                           current_user=current_user)

@app.route('/profile/<username>/avatar', methods=['GET', 'POST'])  # Используем один маршрут
def upload_avatar(username):
    user = User.query.filter_by(username=username).first_or_404()
    current_user = get_current_user()
    if request.method == 'POST':
        avatar = request.files.get('avatar')

        if avatar and allowed_file(avatar.filename):
            filename = f"{user.username}_avatar.{avatar.filename.rsplit('.', 1)[1]}"
            avatar.save(os.path.join(app.config['AVATARS_FOLDER'], filename))
            user.avatar = filename
            db.session.commit()
            flash('Аватар успешно обновлен!', 'success')
    return redirect(url_for('profile', username=username, user=user, current_user=current_user)) 

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)