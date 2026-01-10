# auth.py
from flask import Blueprint, request, render_template, redirect, url_for, session, flash
from models import db, User
from functools import wraps
import smtplib
from email.mime.text import MIMEText
import re, random
import imaplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint('auth', __name__)


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session or not session['logged_in']:
            flash('Пожалуйста, войдите в систему, чтобы получить доступ к этой странице.', 'warning')
            return redirect(url_for('auth.auth'))
        return f(*args, **kwargs)
    return decorated_function


def get_current_user():
    user_id = session.get('user_id')
    if user_id is not None:
        return User.query.get(user_id)
    return None


@auth_bp.route('/auth', methods=['GET', 'POST'])
def auth():
    login_error = None
    register_error = None
    current_user = get_current_user()

    if request.method == 'POST':
        if 'login_submit' in request.form:
            username = request.form['username']
            password = request.form['password']
            user = User.query.filter_by(username=username).first()
            if user and check_password_hash(user.password, password): # Используем check_password_hash
                session['logged_in'] = True
                session['user_id'] = user.id
                return redirect(url_for('index'))
            else:
                login_error = "Неверный логин или пароль"
        elif 'register_submit' in request.form:
            username = request.form['new_username']
            password = request.form['new_password']
            mail = request.form['mail']
            phone = request.form['phone']

            print(
                f"Попытка регистрации: username={username}, mail={mail}, phone={phone}")

            if phone and not re.match(r'^\+\d{3} \d{3}-\d{2}-\d{2}$', phone):
                register_error = "Неверный формат номера телефона"
            elif User.query.filter_by(username=username).first() or User.query.filter_by(mail=mail).first():
                register_error = "Пользователь с таким именем или почтой уже существует"
            else:
                hashed_password = generate_password_hash(password) # Хешируем пароль
                new_user = User(username=username, password=hashed_password, 
                               mail=mail, phone=phone, confirmed=True)
                db.session.add(new_user)
                db.session.commit()

                flash('Регистрация успешна! Теперь вы можете войти.',
                      'success')
                return redirect(url_for('auth.auth'))

    return render_template('auth.html', login_error=login_error, register_error=register_error,
                           current_user=current_user)


@auth_bp.route('/logout')
def logout():
    session.pop('logged_in', None)
    session.pop('user_id', None)
    return redirect(url_for('index'))