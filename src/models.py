from flask_sqlalchemy import SQLAlchemy
import datetime
from datetime import datetime, timezone

db = SQLAlchemy()

# Association table for subscriptions
friends = db.Table('friends',
    db.Column('friend_id', db.Integer, db.ForeignKey('user.id')),
    db.Column('friended_to_id', db.Integer, db.ForeignKey('user.id'))
)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    avatar = db.Column(db.String(255), nullable=True)