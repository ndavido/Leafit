#! /usr/bin/env python3

from flask import request, jsonify
from mongoengine.errors import DoesNotExist
from mongoengine.queryset.visitor import Q
from src.models import Users, FriendRequest, Friends, Notification, FavoriteFuelStation, FuelStation, FuelPrices, UserActivity
from src.middleware.api_key_middleware import require_api_key
from src.utils.helper_utils import handle_api_error
from flask_jwt_extended import jwt_required, get_jwt_identity
import random


@require_api_key
@jwt_required()
def send_friend_request():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        recipient_phone_number = data['friend_number']
        message = data.get('message', '')

        sender = Users.objects.get(id=user_id)
        recipient = Users.objects.get(phone_number=recipient_phone_number)

        if existing_request := FriendRequest.objects(sender=sender, recipient=recipient).first():
            return jsonify({"error": "Friend request already sent"}), 400

        friend_request = FriendRequest(
            sender=sender, recipient=recipient, message=message, status='pending')
        friend_request.save()

        return jsonify({"message": "Friend request sent successfully"}), 200

    except DoesNotExist:
        return jsonify({"error": "User not found"}), 404
    except Exception as e:
        return handle_api_error(e)


@require_api_key
@jwt_required()
def list_friends():
    try:
        user_id = get_jwt_identity()
        user = Users.objects.get(id=user_id)

        friends = Friends.objects(Q(user1=user) | Q(user2=user))

        friends_list = [{
            'friend_id': str(friend_user.id),
            'friend_name': friend_user.first_name
        } for friend in friends for friend_user in [friend.user1, friend.user2] if friend_user.id != user.id]

        return jsonify({"friends": friends_list}), 200

    except Exception as e:
        return handle_api_error(e)


@require_api_key
@jwt_required()
def requested_friends():
    try:
        user_id = get_jwt_identity()
        recipient = Users.objects.get(id=user_id)

        friend_requests = FriendRequest.objects(
            recipient=recipient, status='pending')

        requested_friends_list = [{
            'friend_id': str(requested_friend_user.id),
            'friend_name': requested_friend_user.first_name,
            'request_id': str(friend_request.id),
        } for friend_request in friend_requests for requested_friend_user in [friend_request.sender]]

        return jsonify({"requested_friends": requested_friends_list}), 200

    except Exception as e:
        return handle_api_error(e)


@require_api_key
@jwt_required()
def respond_friend_request():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        request_id = data['request_id']
        action = data['action']

        if action not in ['accept', 'reject']:
            return jsonify({"error": "Invalid action"}), 400

        friend_request = FriendRequest.objects.get(
            id=request_id, recipient=user_id)

        if action == 'accept':
            friend_request.change_status('accepted')
            Friends(user1=friend_request.sender,
                    user2=friend_request.recipient).save()

            Notification(
                user=friend_request.sender,
                message=f"Your friend request to {friend_request.recipient.first_name} has been accepted.",
                type='friend_request_accepted',
                related_document=friend_request
            ).save()
            message = "Friend request accepted"
        else:
            friend_request.change_status('rejected')

            Notification(
                user=friend_request.sender,
                message=f"Your friend request to {friend_request.recipient.first_name} has been rejected.",
                type='friend_request_rejected',
                related_document=friend_request
            ).save()
            message = "Friend request rejected"

        return jsonify({"message": message}), 200

    except DoesNotExist:
        return jsonify({"error": "Friend request not found"}), 404
    except Exception as e:
        return handle_api_error(e)


@require_api_key
@jwt_required()
def cancel_friend_request():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        request_id = data['request_id']

        friend_request = FriendRequest.objects.get(
            id=request_id, sender=user_id)
        friend_request.update(status='canceled')

        Notification(
            user=friend_request.recipient,
            message=f"Friend request from {friend_request.sender.first_name} has been canceled",
            type='friend_request_canceled',
            related_document=friend_request
        ).save()

        return jsonify({"message": "Friend request canceled"}), 200

    except DoesNotExist:
        return jsonify({"error": "Friend request not found"}), 404
    except Exception as e:
        return handle_api_error(e)


@require_api_key
@jwt_required()
def remove_friend():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        friend_id = data['friend_id']

        friendship = Friends.objects(
            (Q(user1=user_id) & Q(user2=friend_id)) |
            (Q(user1=friend_id) & Q(user2=user_id))
        ).first()

        if friendship:
            friendship.delete()
            return jsonify({"message": "Friend removed successfully"}), 200
        else:
            return jsonify({"error": "Friendship does not exist"}), 404

    except DoesNotExist:
        return jsonify({"error": "User not found"}), 404
    except Exception as e:
        return handle_api_error(e)


@require_api_key
@jwt_required()
def search_users():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        search_term = data.get('search_term')

        if not search_term:
            return jsonify({"error": "Search term is required"}), 400

        users = Users.objects(
            (Q(username__icontains=search_term) | Q(phone_number__icontains=search_term)) &
            Q(id__ne=user_id)
        )

        users_list = [{'user_id': str(user.id), 'username': user.username, 'phone_number': user.phone_number}
                      for user in users]

        return jsonify({"users": users_list}), 200

    except Exception as e:
        return handle_api_error(e)


@require_api_key
@jwt_required()
def view_friend_profile():
    try:
        user_id = get_jwt_identity()
        friend_id = request.get_json('friend_id')

        # Verify if users are friends
        friendship = Friends.__objects(
            ((Q(user1=user_id) & Q(user2=friend_id)) |
             (Q(user1=friend_id) & Q(user2=user_id))) &
            Q(status='accepted')
        ).first()

        if not friendship:
            return jsonify({"error": "You are not friends with the requested user"}), 403

        friend_profile = Users.objects.get(id=friend_id)
        friends_fav_stations = FavoriteFuelStation.objects.get(
            user=friend_profile)

        random_station_info = None
        if friends_fav_stations and friends_fav_stations.favorite_stations:

            random_favorite = random.choice(
                friends_fav_stations.favorite_stations)

            random_station = FuelStation.objects(id=random_favorite.id).first()

            if random_station:
                random_station_info = {
                    "station_id": str(random_station.id),
                    "name": random_station.name,
                    "phone_number": random_station.phone_number,
                    "location": {
                        "latitude": random_station.latitude,
                        "longitude": random_station.longitude,
                    }
                }

        recent_activity = UserActivity.objects(
            user=friend_profile).order_by('-timestamp').first()

        profile_data = {
            'username': friend_profile.username,
            'first_name': friend_profile.first_name,
            'surname': friend_profile.surname,
            'phone_number': friend_profile.phone_number,
            'random_fav_station': random_station_info,
            'recent_activity': {
                'activity': recent_activity.details,
                'timestamp': recent_activity.timestamp.isoformat()
            } if recent_activity else None,
            'friendship_start_date': friendship.friendship_start_date.strftime('%Y-%m-%d')
        }

        return jsonify({"friend_profile": profile_data}), 200

    except DoesNotExist:
        return jsonify({"error": "User not found"}), 404
    except Exception as e:
        return handle_api_error(e)


@require_api_key
@jwt_required()
def friend_activity_dashboard():
    try:
        user_id = get_jwt_identity()

        friends = Friends.objects(Q(user1=user_id) | Q(user2=user_id))

        activities = UserActivity.objects(
            user__in=friends).order_by('-timestamp')

        activity_list = [{
            'username': activity.user.username,
            'activity': activity.details,
            'fuel_station': activity.station if activity.station else None,
            'timestamp': activity.timestamp.isoformat(),
        } for activity in activities]

        return jsonify({"activities": activity_list}), 200

    except Exception as e:
        return handle_api_error(e)
