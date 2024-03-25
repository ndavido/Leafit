#! /usr/bin/env python3

import base64
import io
import cv2
import numpy as np
from flask import jsonify


def convert_image_to_base64(image_data):
    return base64.b64encode(image_data).decode('utf-8')


def decode_base64_image(image_data):
    if image_data:
        # Split the header if present
        if 'data:image/jpeg;base64,' in image_data:
            header, image_data = image_data.split(',', 1)
        else:
            header = None

        # Correct padding if necessary
        missing_padding = len(image_data) % 4
        if missing_padding:
            image_data += '=' * (4 - missing_padding)

        image_data_bytes = base64.b64decode(image_data)

        return image_data_bytes
    else:
        return None


def retrieve_image(file):
    in_memory_file = io.BytesIO()
    file.save(in_memory_file)
    data = np.frombuffer(in_memory_file.getvalue(), dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    return image


def upload_image(image):
    if not image:
        return jsonify({'error': 'No image data provided'}), 400

    image_data_bytes = decode_base64_image(image)  # Decode from Base64

    image = cv2.imdecode(np.frombuffer(
        image_data_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)

    if image is None:
        return jsonify({'error': 'Invalid or missing image data'}), 400

    return image
