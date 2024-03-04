# account_service.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from src.middleware.api_key_middleware import require_api_key
from src.utils.encryption_utils import aes_decrypt, aes_encrypt, encryption_key
from src.models.user import Users
from src.utils.helper_utils import handle_api_error


@require_api_key
@jwt_required()
def account():
    try:
        user_id = get_jwt_identity()
        user_info = Users.objects(id=user_id).first()

        if user_info:
            user_info_dict = user_info.to_mongo().to_dict()
            decrypted_phone = aes_decrypt(
                user_info_dict['phone_number'], encryption_key)
            user_info_dict['phone_number'] = decrypted_phone

            excluded_fields = ['_id', 'verification_code',
                               'verified', 'verification_code_sent_at', 'updated_at']
            for field in excluded_fields:
                user_info_dict.pop(field, None)

            return jsonify({"message": "User found", "user": user_info_dict}), 200
        else:
            return jsonify({"error": "User not found"}), 404
    except Exception as e:
        return jsonify({"error": f"Error fetching user account information: {str(e)}"}), 500


@require_api_key
@jwt_required()
def delete_account():
    try:
        user_id = get_jwt_identity()
        user_info = Users.objects(id=user_id).first()

        if user_info:
            user_info.delete()
            return jsonify({"message": "Account deleted successfully!"}), 200
        else:
            return jsonify({"error": "User not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@require_api_key
@jwt_required()
def logout():
    return jsonify({"message": "Logout successful!"}), 200


@require_api_key
@jwt_required()
def edit_account():
    try:
        user_id = get_jwt_identity()
        user = Users.objects(id=user_id).first()

        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json()

        if 'phone_number' in data:
            encrypted_phone = aes_encrypt(data['phone_number'], encryption_key)
            user.phone_number = encrypted_phone
        if 'full_name' in data:
            user.full_name = data['full_name']
        if 'email' in data:
            user.email = data['email']
        if 'reg_full' in data:
            user.reg_full = data['reg_full']

        user.save()
        return jsonify({"message": "Account updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
