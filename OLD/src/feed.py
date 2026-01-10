from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, current_app as app
from models import db, User, Post
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

feed_bp = Blueprint('feed', __name__)

@feed_bp.route('/feed')
def feed():
    current_user = get_current_user()
    if current_user:
        # Get friends and friends of friends
        friends = set(current_user.friends)
        friends_of_friends = set()
        for friend in friends:
            friends_of_friends.update(friend.friends)
        friends_of_friends -= friends
        friends_of_friends -= {current_user}

        # Get posts from friends, friends of friends, and a random selection
        friends_posts = Post.query.filter(Post.user_id.in_([friend.id for friend in friends])).all()
        friends_of_friends_posts = Post.query.filter(Post.user_id.in_([friend.id for friend in friends_of_friends])).all()
        random_posts = Post.query.filter(Post.user_id != current_user.id).order_by(db.func.random()).limit(10).all()

        # Combine posts and ensure uniqueness
        posts = list(set(friends_posts + friends_of_friends_posts + random_posts))
        random.shuffle(posts)

    else:
        # If not logged in, show a random selection of posts
        posts = Post.query.order_by(db.func.random()).limit(20).all()

    return render_template('feed.html', posts=posts, current_user=current_user)