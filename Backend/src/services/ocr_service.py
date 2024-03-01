#! /usr/bin/env python3

from flask import Blueprint, request, jsonify
from src.middleware.api_key_middleware import require_api_key
from src.utils.ocr_utils import extract_receipt_info_single, allowed_file, ocr_cleanup
from src.utils.image_utils import convert_image_to_base64, retrieve_image
from src.models.receipt_ocr import ReceiptOcr
from src.models.user import Users


@require_api_key
def upload_receipt():

    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        try:
            image = retrieve_image(file)

            extracted_info_single = extract_receipt_info_single(
                ocr_cleanup(image), image)
            receipt_image_base64 = convert_image_to_base64(image)
            return jsonify(extracted_info_single, receipt_image_base64)
        except Exception as e:
            return jsonify({'error': 'Failed to process image', 'details': str(e)}), 500
    else:
        return jsonify({'error': 'Invalid file format'}), 400


@require_api_key
def save_receipt():
    try:
        receipt_data = request.get_json()

        username = receipt_data.get('username')
        receipt_image_base64 = receipt_data.get('receipt_image_base64')
        fuel_type = receipt_data.get('fuel_type')
        volume = receipt_data.get('volume')
        price_per_litre = receipt_data.get('price_per_litre')
        total = receipt_data.get('total')

        user = Users.objects.get(username=username)
        receipt = ReceiptOcr(
            user=user,
            receipt=receipt_image_base64,
            fuel_type=fuel_type,
            volume=volume,
            price_per_litre=price_per_litre,
            total=total
        )
        receipt.save()

    except Exception as e:
        return jsonify({'error': 'Failed to save receipt', 'details': str(e)}), 500
