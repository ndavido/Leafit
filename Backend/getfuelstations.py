import os
import googlemaps
from database import Database
from models import FuelStation, OpeningHours
from dotenv import load_dotenv
import time

# ref: https://medium.com/swlh/scraping-google-maps-to-measure-electric-vehicle-infrastructure-real-time-ev-charger-data-v1-0-77a2b4142a78
# ref: https://developers.google.com/maps/documentation/places/web-service/overview

load_dotenv()

key = os.getenv('GOOGLE_MAPS_API_KEY')

db = Database()

gmaps = googlemaps.Client(key=key)

ireland_bounds = {
    'north': 54.4061,
    'south': 54.2189,
    'west':  -7.1897,
    'east': -6.9865,
}

# search_types = ['gas_station']
step_size = 0.1
petrol_results = []


def get_places_in_region(north, south, east, west):
    location = ((north + south) / 2, (east + west) / 2)
    fuel_stations = []
    try:
        places_result = gmaps.places_nearby(location, radius=100000, type='gas_station', keyword='petrol diesel')
        print(f"Found {len(places_result['results'])} gas stations")
        for place in places_result.get('results', []):
            fuel_station = process_place(place)
            if fuel_station:
                fuel_stations.append(fuel_station)
    except Exception as e:
        print(f"An error occurred while retrieving places: {e}")
    return fuel_stations


def process_place(place):
    name = place['name']
    address = place.get('vicinity', 'Address not available')
    latitude = place['geometry']['location']['lat']
    longitude = place['geometry']['location']['lng']
    place_id = place['place_id']
    existing_station = FuelStation.objects(place_id=place_id).first()
    if existing_station:
        existing_station.name = name
        existing_station.address = address
        existing_station.latitude = latitude
        existing_station.longitude = longitude
    else:
        existing_station = FuelStation(
            name=name,
            address=address,
            latitude=latitude,
            longitude=longitude,
            place_id=place_id
        )
    details_result = gmaps.place(place_id=place_id,
                                 fields=['name', 'formatted_address', 'geometry', 'opening_hours',
                                         'formatted_phone_number'])
    result_data = details_result.get('result', {})

    opening_hours_data = result_data.get('opening_hours', {}).get('periods', [])
    opening_hours = [OpeningHours(
        day=str(period['open']['day']),
        hours=f"{period['open']['time']}–{period['close']['time']}" if 'close' in period else ""
    ) for period in opening_hours_data] if opening_hours_data else None
    existing_station.opening_hours = opening_hours
    phone_number = result_data.get('formatted_phone_number', 'Phone number not available')
    existing_station.phone_number = phone_number

    print(f"Place processed: {existing_station.name}")
    return existing_station


current_north = ireland_bounds['north']
total_fuel_station_count = 0
while current_north > ireland_bounds['south']:
    current_south = max(current_north - step_size, ireland_bounds['south'])
    current_west = ireland_bounds['west']
    while current_west < ireland_bounds['east']:
        current_east = min(current_west + step_size, ireland_bounds['east'])
        fuel_stations = get_places_in_region(current_north, current_south, current_east, current_west)
        for fuel_station in fuel_stations:
            fuel_station.save()
        total_fuel_station_count += len(fuel_stations)
        current_west = current_east
    current_north = current_south

REQUEST_DELAY = 2
time.sleep(REQUEST_DELAY)

print(f"Data inserted into MongoDB. Total Fuel Stations added: {total_fuel_station_count}")
