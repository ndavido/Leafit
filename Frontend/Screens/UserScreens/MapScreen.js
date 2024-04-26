import React, {useState, useEffect, useRef, useMemo} from "react";
import {
    View,
    StyleSheet,
    Platform,
    Button,
    Linking,
    Image,
    Modal,
    ScrollView, TouchableOpacity
} from "react-native";
import BottomSheet from '@gorhom/bottom-sheet';
import * as Location from "expo-location";
import Slider from '@react-native-community/slider';
import {useCombinedContext} from "../../CombinedContext";
import Icon from 'react-native-vector-icons/FontAwesome';
import openMap from 'react-native-open-maps';

const jsonBig = require('json-bigint');

const isWeb = Platform.OS !== "ios" && Platform.OS !== "android";

let MapView;
let MapViewDirections;
if (!isWeb) {
    MapView = require("react-native-map-clustering").default;
    // MapView = require("react-native-maps").default;
    MapViewDirections = require("react-native-maps-directions").default;
}

// Styling
import {H2, H3, H4, H5, H6, H7, H8} from "../../styles/text";
import {
    Container,
    ButtonContainer,
    CardContainer,
    Card,
    ModalContent,
    InputTxt,
    LRContainer, LRButtonDiv, CardMini, WrapperScroll
} from "../../styles/styles";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {AnimatedGenericButton, AnimatedHeartButton, ButtonButton, ToggleButton} from "../../styles/buttons";
import CustomMarker from "../../Components/customMarker";
import axios from "axios";
import {jwtDecode} from "jwt-decode";

// Images
import carWashIcon from '../../assets/serviceIcons/fs_carwash.png';
import foodIcon from '../../assets/serviceIcons/fs_hot_food.png';
import atmIcon from '../../assets/serviceIcons/fs_atm.png';
import parkingIcon from '../../assets/serviceIcons/fs_parking.png';
import serviceIcon from '../../assets/serviceIcons/fs_service.png';
import conStoreIcon from '../../assets/serviceIcons/fs_con_store.png';
import ScrollPicker from "react-native-wheel-scrollview-picker";


const apiMapKey = process.env.REACT_NATIVE_GoogleMaps_API_KEY;
const apiKey = process.env.REACT_NATIVE_API_KEY;
const url = process.env.REACT_APP_BACKEND_URL
console.log(apiMapKey)

const MapScreen = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [petrolStations, setPetrolStations] = useState([]);

    const [initialAnimationDone, setInitialAnimationDone] = useState(false);
    const [location, setLocation] = useState(null);
    const {token, userData, setUser, updateUserFromBackend} = useCombinedContext();

    const [favoriteStations, setFavoriteStations] = useState([]);

    const [favoriteStatus, setFavoriteStatus] = useState({});

    const mapRef = useRef(null);
    const [tempRadius, setTempRadius] = useState(userData.radius_preferences || 30);

    const [estimatedDuration, setEstimatedDuration] = useState(null);
    const [estimatedDistance, setEstimatedDistance] = useState(null);
    const [estimatedTime, setEstimatedTime] = useState(null);
    const [estimatedPrice, setEstimatedPrice] = useState(null);

    const [detailedSteps, setDetailedSteps] = useState([]);
    const [isJourneyActive, setIsJourneyActive] = useState(false);
    const [journeyCoordinates, setJourneyCoordinates] = useState([]);
    const [journeyMode, setJourneyMode] = useState(false);

    const [selectedStation, setSelectedStation] = useState(null);
    const [updateModalVisible, setUpdateModalVisible] = useState(false);

    const [selectedPetrolEuros, setSelectedPetrolEuros] = useState(0);
    const [selectedPetrolCents, setSelectedPetrolCents] = useState(0);
    const [selectedDieselEuros, setSelectedDieselEuros] = useState(0);
    const [selectedDieselCents, setSelectedDieselCents] = useState(0);

    const [showStationInfo, setShowStationInfo] = useState(true);
    const [showRouteInfo, setShowRouteInfo] = useState(false);
    const bottomSheetRef = useRef(null);
    const optionsScrollViewRef = useRef(null);
    const stationsScrollViewRef = useRef(null);
    const [isMenuExpanded, setIsMenuExpanded] = useState(false);

    const [nearbyStations, setNearbyStations] = useState([]);
    const [showNearbyStationsSheet, setShowNearbyStationsSheet] = useState(false);
    const [sortOption, setSortOption] = useState('distance');
    const [sortedStations, setSortedStations] = useState([]);

    const [refreshing, setRefreshing] = useState(false);
    const [buttonEnabled, setButtonEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const snapPoints = useMemo(() => ['20%', '40%', '85%'], []);

    const eurosData = ['1', '2', '3'];
    const centsData = Array.from({length: 100}, (_, i) => (i < 10 ? `0${i}` : `${i}`));

    const getDistanceBetweenLocations = (location1, location2) => {
        const R = 6371;
        const dLat = deg2rad(location2.latitude - location1.latitude);
        const dLon = deg2rad(location2.longitude - location1.longitude);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(location1.latitude)) * Math.cos(deg2rad(location2.latitude)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance * 1000;
    };

    const deg2rad = (deg) => deg * (Math.PI / 180);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        const refreshInterval = setInterval(async () => {
            console.log('Refreshing data...');
            await manualRefresh();
        }, 60000);

        setShowStationInfo(false);

        const fetchLocationAndPetrolStations = async () => {
            let {status} = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                console.error("Permission to access location was denied");
                fetchFavoriteStations(null);
                return;
            }

            try {
                const userLocation = await Location.getCurrentPositionAsync({});
                setLocation(userLocation);

                // TODO DEV ONLY
                console.log("User Location: ", userLocation);
                if (!initialAnimationDone) {
                    mapRef.current?.animateCamera(
                        {
                            center: {
                                latitude: userLocation.coords.latitude,
                                longitude: userLocation.coords.longitude,
                            },
                            altitude: 20000,
                            pitch: 0,
                            heading: 1,
                        },
                        {duration: 1500}
                    );
                    setInitialAnimationDone(true);
                }

                Location.watchPositionAsync({distanceInterval: 10}, (newLocation) => {
                    setLocation(newLocation);
                });

                fetchFavoriteStations(userLocation);
            } catch (error) {
                console.error("Error fetching user location:", error);
            }
        };

        fetchLocationAndPetrolStations();

        setIsLoading(false);

        const timeoutId = setTimeout(() => {
            setButtonEnabled(true);
        }, 10000);

        const calculateSortedStations = () => {
            if (sortOption === 'distance') {
                setSortedStations([...nearbyStations].sort((a, b) => calculateDistance(a) - calculateDistance(b)));
            } else if (sortOption === 'price') {
                setSortedStations([...nearbyStations].sort((a, b) => a.prices.petrol_price - b.prices.petrol_price));
            }
        };

        calculateSortedStations();

        return () => {
            clearInterval(refreshInterval);
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, [nearbyStations, sortOption]);

    const manualRefresh = async () => {
        setRefreshing(true);
        const token = await AsyncStorage.getItem('token');

        if (token) {
            await updateUserFromBackend();

            const location = await Location.getCurrentPositionAsync({});
            setLocation(location);
            await fetchFavoriteStations(location);
        }
        setRefreshing(false);
    };

    const fetchPetrolStations = async (userLocation) => {
        try {
            const requestBody = {
                user_longitude: userLocation.coords.longitude || null,
                user_latitude: userLocation.coords.latitude || null,
                radius: userData.radius_preferences || null,
            };

            const response = await axios.post(`${url}/fuel_stations`, requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                    'Authorization': `Bearer ${token}`
                },
            });

            console.log(response.data)

            // TODO Remove Dev Only

            setPetrolStations(response.data)

        } catch (error) {
            console.error(error);
        }
    };

    const fetchFavoriteStations = async (userLocation) => {
        try {
            const user_id = jwtDecode(token).sub;

            console.log("User ID: ", user_id)

            const updatedUserData = {
                id: user_id,
            };

            const fav_response = await axios.get(`${url}/get_favorite_fuel_stations`, {
                params: updatedUserData,
                headers: {
                    "X-API-Key": apiKey,
                    'Authorization': `Bearer ${token}`
                },
            });

            if (fav_response.data && fav_response.data.favorite_stations) {
                const initialFavoriteStatus = fav_response.data.favorite_stations.reduce(
                    (status, favStation) => {
                        status[favStation.station_id] = true;
                        return status;
                    },
                    {}
                );

                setFavoriteStations(fav_response.data.favorite_stations);
                setFavoriteStatus(initialFavoriteStatus);
                // TODO Remove Dev only!!
                console.log("Fav Stations:", fav_response.data.favorite_stations)

            } else {
                console.log("No favorite stations found");
                setFavoriteStations([]);
                setFavoriteStatus({});
            }
            fetchPetrolStations(userLocation);
        } catch (error) {
            console.error('Error fetching favorite fuel stations:', error);
        }
    };

    const handleUpdateRadius = async (radius) => {
        try {
            const config = {
                headers: {
                    'X-API-Key': apiKey,
                    'Authorization': `Bearer ${token}`
                },
            };


            const data = {
                radius_preferences: radius,
            };

            const updatedUserData = {
                ...userData,
                radius_preferences: radius,
            };

            const response = await axios.patch(`${url}/save_preferences`, data, config);

            if (response.data) {
                console.log("Update successful");

                await setUser({...updatedUserData});

                await manualRefresh();
            } else {
                console.log("Update unsuccessful");
            }
        } catch (error) {
            console.error('Error updating user Radius:', error);
        }
    };

    const handleUpdatePress = async () => {
        try {
            const updatedPetrolPrice = `${selectedPetrolEuros}.${selectedPetrolCents}`;
            const updatedDieselPrice = `${selectedDieselEuros}.${selectedDieselCents}`;

            console.log('New Petrol Price:', updatedPetrolPrice);
            console.log('New Diesel Price:', updatedDieselPrice);

            const payload = {
                fuelPrices: [{
                    station_id: selectedStation.id,
                    petrol_price: updatedPetrolPrice,
                    diesel_price: updatedDieselPrice,
                    timestamp: new Date().toISOString(),
                },],
            };

            const response = await fetch(`${url}/store_fuel_prices`, {
                method: 'POST', headers: {
                    "X-API-Key": apiKey,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }, body: JSON.stringify(payload),
            });

            if (response.ok) {
                console.log('Successfully updated fuel prices');
                setSelectedStation(prevStation => ({
                    ...prevStation,
                    prices: {
                        petrol_price: updatedPetrolPrice,
                        diesel_price: updatedDieselPrice,
                        petrol_updated_at: new Date().toISOString(),
                        diesel_updated_at: new Date().toISOString(),
                    }
                }));

                await manualRefresh();
            } else {
                console.error('Failed to update fuel prices');
            }
        } catch (error) {
            console.error('Error updating fuel prices:', error);
        }

        setUpdateModalVisible(false);
    };

    const handleLikePress = async (stationId) => {
        try {

            const user_id = jwtDecode(token).sub;

            const payload = {
                id: user_id,
                station_id: stationId,
            };

            const config = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            };

            const response = await fetch(`${url}/manage_favorite_fuel_station`, config);

            if (response.ok) {
                console.log('Favorite status updated successfully');

                // TODO Fix Update the favorite status for the specific station
                setFavoriteStatus((prevStatus) => ({
                    ...prevStatus,
                    [stationId]: !prevStatus[stationId],
                }));
                await manualRefresh();
            } else {
                console.error('Failed to update favorite status');
            }
        } catch (error) {
            console.error('Error updating favorite status:', error);
        }
    };


    const handleMarkerPress = (station) => {
        setSelectedStation(station);
        const storedPetrolPrice = `${station.prices.petrol_price || '1.69'}`;
        const storedDieselPrice = `${station.prices.diesel_price || '1.69'}`;

        console.log("Stored Petrol Price: ", storedPetrolPrice);

        const [initialPetrolEuros, initialPetrolCents] = storedPetrolPrice.split('.');
        const [initialDieselEuros, initialDieselCents] = storedDieselPrice.split('.');

        setSelectedPetrolEuros(parseInt(initialPetrolEuros, 10));
        setSelectedPetrolCents(parseInt(initialPetrolCents, 10));
        setSelectedDieselEuros(parseInt(initialDieselEuros, 10));
        setSelectedDieselCents(parseInt(initialDieselCents, 10));

        setShowStationInfo(true);
        setShowRouteInfo(false);
        setShowNearbyStationsSheet(false);

        // TODO Remove Dev Only
        console.log("Selected Station: ", station);
    };

    const getDirectionsInfo = async (origin, destination) => {
        try {
            const apiUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiMapKey}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            return data.routes[0].legs[0];
        } catch (error) {
            console.error('Error fetching directions:', error);
            return {};
        }
    };

    const calculateJourneyPrice = (distance, kmPerLiter, petrolCostPerLiter) => {
        const distanceValue = parseFloat(distance.split(" ")[0]);
        const litersNeeded = distanceValue / kmPerLiter;
        const totalPrice = litersNeeded * petrolCostPerLiter;
        return totalPrice.toFixed(2);
    };

    const handleRoutePress = async () => {
        if (selectedStation && location) {
            setShowStationInfo(false);
            setShowRouteInfo(true);

            const origin = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };

            const destination = {
                latitude: selectedStation.location.latitude,
                longitude: selectedStation.location.longitude,
            };

            setUpdateModalVisible(false);

            const directionsInfo = await getDirectionsInfo(origin, destination);

            setDetailedSteps(directionsInfo.steps);
            setEstimatedDuration(directionsInfo.duration.text);
            setEstimatedDistance(directionsInfo.distance.text);

            const [durationValue, durationUnit] = directionsInfo.duration.text.split(" ");

            if (durationValue && durationUnit) {
                const newEstimatedTime = new Date(currentTime.getTime() + parseInt(durationValue, 10) * 60000);
                setEstimatedTime(newEstimatedTime);
                console.log("New Estimated Time:", newEstimatedTime);
            }

            let petrolCostPerLiter;
            if (selectedStation.prices && selectedStation.prices.petrol_price) {
                petrolCostPerLiter = parseFloat(selectedStation.prices.petrol_price);
            } else {
                petrolCostPerLiter = 1.72; // TODO Hardcoded value
            }

            const journeyPrice = calculateJourneyPrice(directionsInfo.distance.text, 18, petrolCostPerLiter);
            console.log("Journey Price:", journeyPrice);

            setEstimatedPrice(journeyPrice);

            mapRef.current.fitToCoordinates([origin, destination], {
                edgePadding: {top: 50, right: 50, bottom: 200, left: 50},
            });
        }
    };

    const handleCancelPress = () => {
        setShowStationInfo(true);
        setShowRouteInfo(false);
        if (selectedStation) {
            mapRef.current?.animateCamera(
                {
                    center: {
                        latitude: selectedStation.location.latitude,
                        longitude: selectedStation.location.longitude,
                    },
                    altitude: 50000,
                    pitch: 0,
                    heading: 1,
                },
                {duration: 1500}
            );
        } else {
            mapRef.current?.animateCamera(
                {
                    center: {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    },
                    altitude: 50000,
                    pitch: 0,
                    heading: 1,
                },
                {duration: 1500}
            );
        }

    };

    const handleCameraMove = (stationLocation) => {
        mapRef.current?.animateCamera(
            {
                center: {
                    latitude: stationLocation.latitude,
                    longitude: stationLocation.longitude,
                },
                altitude: 20000,
                pitch: 0,
                heading: 1,
            },
            {duration: 1500}
        );
    }

    const updatePrice = (newEuros, newCents, setPriceEuros, setPriceCents) => {
        setPriceEuros(newEuros);
        setPriceCents(newCents);
    };

    const handleOpenInMaps = () => {
        const endLatitude = selectedStation.location.latitude;
        const endLongitude = selectedStation.location.longitude;

        openMap({latitude: endLatitude, longitude: endLongitude});
    }

    const renderMap = () => {
        if (isWeb) {
            return (<View style={{flex: 1}}>
                <H2>Switch to Mobile plz x</H2>
            </View>);
        } else {
            return (<MapView
                style={{flex: 1}}
                initialRegion={{
                    latitude: 53.98444410090042,
                    longitude: -6.393485737521783,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                ref={mapRef}
                showsUserLocation={true}
                userInterfaceStyle={"dark"}
                pitchEnabled={journeyMode}
            >
                {petrolStations.map((station, index) => (
                    <CustomMarker
                        key={index}
                        tracksViewChanges={false}
                        coordinate={{
                            latitude: station.location.latitude,
                            longitude: station.location.longitude,
                        }}
                        onPress={() => handleMarkerPress(station)}
                        petrolUpdatedAt={station.prices.petrol_updated_at}
                        dieselUpdatedAt={station.prices.diesel_updated_at}
                        isFavorite={favoriteStations.some(favStation => favStation.station_id === station.id)}
                        onHeartPress={() => handleLikePress(station.id)}
                        isSelected={selectedStation && selectedStation.id === station.id}
                    />
                ))}
                {selectedStation && location && (showRouteInfo || isJourneyActive) && (
                    <MapViewDirections
                        timePrecision="now"
                        origin={isJourneyActive ? journeyCoordinates[0] : {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        }}
                        destination={isJourneyActive ? journeyCoordinates[journeyCoordinates.length - 1] : {
                            latitude: selectedStation.location.latitude,
                            longitude: selectedStation.location.longitude,
                        }}
                        waypoints={isJourneyActive ? journeyCoordinates.slice(1, -1) : []}
                        apikey={apiMapKey}
                        strokeWidth={5}
                        strokeColor="#6BFF91"
                        onReady={result => {
                            console.log(`Distance 2: ${result.distance} km`)
                            console.log(`Duration 2: ${result.duration} min.`)
                        }}
                    />
                )}
            </MapView>);
        }
    };

    const renderStationBottomSheet = () => {
        const handleBottomSheetChange = (index) => {
            const isFullyOpen = index === 2;
            stationsScrollViewRef.current.setNativeProps({scrollEnabled: isFullyOpen});
        };

        if (!isWeb && showStationInfo) {
            return (
                <BottomSheet snapPoints={snapPoints}
                             backgroundStyle={{
                                 backgroundColor: '#F7F7F7'
                             }} index={0} onChange={handleBottomSheetChange}>
                    {selectedStation && showStationInfo && (
                        <ScrollView style={{marginTop: 10}} ref={stationsScrollViewRef}>
                            <Container style={{paddingTop: 10}}>
                                <H3 weight='600' style={{lineHeight: 24}}>{selectedStation.name}</H3>
                                <H6 weight='400' style={{opacity: 0.6, lineHeight: 16}}>Fuel Station</H6>
                                <ButtonContainer>
                                    <ButtonButton icon="location-pin" text="Route To Station"
                                                  onPress={handleRoutePress}/>
                                    <View style={{flexDirection: 'row'}}>
                                        <AnimatedHeartButton
                                            initialIsActive={favoriteStatus[selectedStation.id] || false}
                                            onPress={() => handleLikePress(selectedStation.id)}/>
                                        <AnimatedGenericButton onPress={() => setUpdateModalVisible(true)}/>
                                    </View>
                                </ButtonContainer>
                                <H4>Current Prices</H4>
                                <CardContainer style={{marginRight: -10, marginLeft: -10, marginBottom: 20}}>
                                    <Card>
                                        <H5 style={{opacity: 0.6, textAlign: 'center'}}>Petrol</H5>
                                        <H3 weight='600'
                                            style={{textAlign: 'center'}}>{selectedStation.prices.petrol_price ? parseFloat(selectedStation.prices.petrol_price).toFixed(2) : 'NA'}</H3>
                                        <H8 style={{opacity: 0.6, textAlign: 'center'}}>Last
                                            Updated: {selectedStation.prices.petrol_updated_at}</H8>
                                    </Card>
                                    <Card>
                                        <H5 style={{opacity: 0.6, textAlign: 'center'}}>Diesel</H5>
                                        <H3 weight='600'
                                            style={{textAlign: 'center'}}>{selectedStation.prices.diesel_price ? parseFloat(selectedStation.prices.diesel_price).toFixed(2) : 'NA'}</H3>
                                        <H8 style={{opacity: 0.6, textAlign: 'center'}}>Last
                                            Updated: {selectedStation.prices.diesel_updated_at}</H8>
                                    </Card>
                                </CardContainer>
                                <H4>About</H4>
                                <H6>Services</H6>
                                <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                                    {selectedStation.facilities && Object.entries(selectedStation.facilities).map(([facility, available]) => (
                                        available && (
                                            <View key={facility}
                                                  style={{marginRight: 10, marginTop: 10, marginBottom: 30}}>
                                                <Image source={
                                                    facility === 'convenience_store' ? conStoreIcon :
                                                        facility === 'food' ? foodIcon :
                                                            facility === 'atm' ? atmIcon :
                                                                facility === 'car_parking' ? parkingIcon :
                                                                    facility === 'car_wash' ? carWashIcon :
                                                                        facility === 'car_service' ? serviceIcon :
                                                                            null
                                                }
                                                       style={{width: 40, height: 40}}
                                                />
                                            </View>
                                        )
                                    ))}
                                </View>
                                <H6>Opening Hours</H6>
                                <H6 style={{opacity: 0.6}}>{selectedStation.opening_hours}</H6>
                                <H6>Phone Number</H6>
                                <H6 style={{opacity: 0.6, color: '#3891FA'}}
                                    onPress={() => {
                                        if (selectedStation && selectedStation.phone_number) {
                                            const phoneNumber = `tel:${selectedStation.phone_number}`;
                                            Linking.openURL(phoneNumber);
                                        }
                                    }}>{selectedStation.phone_number}</H6>
                                <H6 style={{opacity: 0.6}}>{selectedStation.details}</H6>
                                <H6>Address</H6>
                                <H6 style={{opacity: 0.6}}>{selectedStation.address},</H6>
                                <H6 style={{opacity: 0.6}}>Ireland</H6>

                            </Container>
                        </ScrollView>)}
                </BottomSheet>);
        } else {
            return null;
        }
    };

    const renderRouteInfoBottomSheet = () => {
        if (!isWeb && showRouteInfo) {
            return (
                <BottomSheet snapPoints={['20%', '85%']} index={0} ref={bottomSheetRef}>
                    <Container>
                        <H4 style={{flexDirection: 'row'}}>{estimatedDuration} ({estimatedDistance})</H4>
                        <H6 style={{opacity: 0.7}}>Estimated Price: €{estimatedPrice} - 18km/l @ €1.77</H6>
                        <H6 style={{opacity: 0.7}}>(Based Off Your Selected Vehicle)</H6>
                        <ButtonContainer>
                            <ButtonButton text="Open In Maps" onPress={handleOpenInMaps}/>
                            <ButtonButton style={{float: "left"}} icon="cross" text="Exit"
                                          onPress={handleCancelPress}/>
                        </ButtonContainer>
                        <H4 style={{flexDirection: 'row'}}>Directions</H4>
                        <ScrollView>
                            {detailedSteps.map((step, index) => (
                                <View key={index}>
                                    <H6>{step.html_instructions.replace(/<[^>]*>/g, '')}</H6>
                                    <H6 style={{opacity: 0.6}}>{step.distance.text}</H6>
                                </View>
                            ))}
                        </ScrollView>
                    </Container>
                </BottomSheet>
            );
        } else {
            return null;
        }
    };

    const calculateDistance = (station) => {
        return getDistanceBetweenLocations(location.coords, station.location);
    };

    function convertMetersToKilometers(distanceInMeters) {
        return (distanceInMeters / 1000).toFixed(2);
    }

    const findNearbyStations = (userLocation) => {
        const nearbyStations = [];

        petrolStations.forEach(station => {
            const stationLocation = {
                latitude: station.location.latitude,
                longitude: station.location.longitude
            };

            const distanceToStation = getDistanceBetweenLocations(userLocation, stationLocation);

            if (distanceToStation <= 20 * 1000) { // Convert 50 kilometers to meters
                nearbyStations.push(station);
            }
        });

        return nearbyStations;
    };

    const renderOptionsPress = () => {
        setShowStationInfo(false);
        setShowRouteInfo(false);
        const nearbyStations = findNearbyStations(location.coords);
        setNearbyStations(nearbyStations);
        console.log('Nearby stations:', nearbyStations);
        setShowNearbyStationsSheet(true);
    };

    const handleNearbySelectedStation = (station) => {
        setSelectedStation(station);
        handleCameraMove(station.location);
        setShowNearbyStationsSheet(false);
        setShowStationInfo(true);
        setShowRouteInfo(false);
    }

    const renderOptionsBottomSheet = () => {
        const debounce = (func, delay) => {
            let timeoutId;
            return (...args) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func(...args), delay);
            };
        };

        const debouncedSetTempRadius = debounce(setTempRadius, 150);

        const handleBottomSheetChange = (index) => {
            const isFullyOpen = index === 1;
            optionsScrollViewRef.current.setNativeProps({scrollEnabled: isFullyOpen});
        };

        if (!isWeb && showNearbyStationsSheet) {
            return (
                <BottomSheet snapPoints={['30%', '85%']} index={0} onChange={handleBottomSheetChange}>
                    <ScrollView style={{marginTop: 10}} ref={optionsScrollViewRef}>
                        <Container style={{paddingTop: 10}}>
                            <>
                                <View>
                                    <View>
                                        <H4>Map Radius</H4>
                                        <H6 style={{opacity: 0.6}}>Higher Kilometers can cause performance Issues</H6>
                                    </View>
                                </View>
                                <View>
                                    <Slider
                                        value={userData.radius_preferences}
                                        onValueChange={debouncedSetTempRadius}
                                        minimumValue={30}
                                        maximumValue={400}
                                        step={10}
                                    />
                                    <H5>Radius: {tempRadius}km</H5>
                                    <ButtonContainer style={{display: 'flex'}}>
                                        <ButtonButton place="right" txtWidth="100%" width="40%" text="Save Radius"
                                                      onPress={() => handleUpdateRadius(tempRadius)}
                                                      disabled={!userData.radius_preferences || tempRadius === userData.radius_preferences}/>
                                    </ButtonContainer>
                                </View>
                            </>
                            <H4 style={{marginTop: 10}}>Stations Near Me</H4>
                            <H6 style={{opacity: 0.6}}>Sort By Distance or Price</H6>
                            <LRContainer mTop={10} mRight={-1} mLeft={-1}>
                                <ButtonButton accessibilityLabel="Register Button" accessible={true}
                                              txtWidth="100%" width="50%"
                                              txtColor={sortOption === 'distance' ? '#FFFFFF' : 'black'} text="distance"
                                              color={sortOption === 'distance' ? '#6bff91' : '#F7F7F7'}
                                              onPress={() => setSortOption('distance')}
                                />
                                <ButtonButton accessibilityLabel="Register Button" accessible={true}
                                              color={sortOption === 'price' ? '#6bff91' : '#F7F7F7'} txtWidth="100%"
                                              width="50%"
                                              txtColor={sortOption === 'price' ? '#FFFFFF' : 'black'} text="price"
                                              onPress={() => setSortOption('price')}/>
                            </LRContainer>
                            <View>
                                {sortedStations.map(station => (
                                    <TouchableOpacity
                                        key={station.id}
                                        onPress={() => handleNearbySelectedStation(station)}
                                    >
                                        <CardMini>
                                            <H5>{station.name}</H5>
                                            <H6 style={{opacity: 0.8}}>Direct Distance from
                                                location: {convertMetersToKilometers(calculateDistance(station))}km</H6>
                                            <H6 style={{opacity: 0.6}}>{station.address}</H6>
                                            <H6 style={{marginTop: 10}}>Current Prices</H6>
                                            <CardContainer style={{marginRight: -10, marginLeft: -10}}>
                                                <Card>
                                                    <H5 style={{opacity: 0.6, textAlign: 'center'}}>Petrol</H5>
                                                    <H3 weight='600'
                                                        style={{textAlign: 'center'}}>{station.prices.petrol_price ? parseFloat(station.prices.petrol_price).toFixed(2) : 'NA'}</H3>
                                                    <H8 style={{opacity: 0.6, textAlign: 'center'}}>Last
                                                        Updated: {station.prices.petrol_updated_at}</H8>
                                                </Card>
                                                <Card>
                                                    <H5 style={{opacity: 0.6, textAlign: 'center'}}>Diesel</H5>
                                                    <H3 weight='600'
                                                        style={{textAlign: 'center'}}>{station.prices.diesel_price ? parseFloat(station.prices.diesel_price).toFixed(2) : 'NA'}</H3>
                                                    <H8 style={{opacity: 0.6, textAlign: 'center'}}>Last
                                                        Updated: {station.prices.diesel_updated_at}</H8>
                                                </Card>
                                            </CardContainer>
                                        </CardMini>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </Container>
                    </ScrollView>
                </BottomSheet>
            );
        } else {
            return null;
        }
    };

    return (<View style={{flex: 1}}>
        {renderMap()}
        {renderStationBottomSheet()}
        {renderRouteInfoBottomSheet()}
        {renderOptionsBottomSheet()}
        <View style={{position: 'absolute', top: 55, left: 10, zIndex: 0, display: 'flex', flexDirection: 'row'}}>
            <TouchableOpacity
                style={{marginRight: 10}}>
                <ButtonButton series="mci" disabled={!buttonEnabled} icon="information" iconColor="#b8bec2" color="#F7F7F7"
                              onPress={renderOptionsPress}/>
            </TouchableOpacity>
            <TouchableOpacity>
                <ButtonButton icon="list" iconColor="#b8bec2" disabled={!buttonEnabled} color="#F7F7F7" onPress={renderOptionsPress}/>
            </TouchableOpacity>
        </View>

        <Modal
            animationType="slide"
            transparent={true}
            visible={updateModalVisible}
            onRequestClose={() => setUpdateModalVisible(false)}
        >
            <View style={styles.modalContainer}>
                <ModalContent>
                    <H5 tmargin="10px" bmargin="20px" style={{textAlign: 'center'}}>Update Price</H5>
                    <ButtonContainer style={{position: 'absolute', marginTop: 20, marginLeft: 20}}>
                        <View style={{zIndex: 1, marginLeft: 'auto', marginRight: 0}}>
                            <ButtonButton icon="cross" color="#eaedea" iconColor="#b8bec2"
                                          onPress={() => setUpdateModalVisible(false)}/>
                        </View>
                    </ButtonContainer>
                    <CardContainer style={{marginRight: -10, marginLeft: -10}}>
                        <Card>
                            <H6 style={{opacity: 0.6, textAlign: 'center'}}>Petrol (€)</H6>
                            <View style={styles.pickerRow}>
                                <ScrollPicker
                                    dataSource={eurosData}
                                    selectedIndex={selectedPetrolEuros - 1}
                                    onValueChange={(val, index) => updatePrice(val, selectedPetrolCents, setSelectedPetrolEuros, setSelectedPetrolCents)}
                                    itemTextStyle={{fontFamily: 'Poppins_500Medium'}}
                                    wrapperHeight={120}
                                    wrapperBackground={'#FFFFFF'}
                                    itemHeight={40}
                                    highlightColor={'#d8d8d8'}
                                    highlightBorderWidth={2}
                                    activeItemColor={'#222121'}
                                    itemColor={'#B4B4B4'}
                                />
                                <ScrollPicker
                                    dataSource={centsData}
                                    selectedIndex={selectedPetrolCents}
                                    onValueChange={(val, index) => updatePrice(selectedPetrolEuros, val, setSelectedPetrolEuros, setSelectedPetrolCents)}
                                    itemTextStyle={{fontFamily: 'Poppins_500Medium'}}
                                    wrapperHeight={120}
                                    wrapperBackground={'#FFFFFF'}
                                    itemHeight={40}
                                    highlightColor={'#d8d8d8'}
                                    highlightBorderWidth={2}
                                    activeItemColor={'#222121'}
                                    itemColor={'#B4B4B4'}
                                />
                            </View>
                        </Card>
                        <Card>
                            <H6 style={{opacity: 0.6, textAlign: 'center'}}>Diesel (€)</H6>
                            <View style={styles.pickerRow}>
                                <ScrollPicker
                                    dataSource={eurosData}
                                    itemTextStyle={{fontFamily: 'Poppins_500Medium'}}
                                    wrapperHeight={120}
                                    selectedIndex={selectedDieselEuros - 1}
                                    onValueChange={(val, index) => updatePrice(val, selectedDieselCents, setSelectedDieselEuros, setSelectedDieselCents)}
                                    wrapperBackground={'#FFFFFF'}
                                    itemHeight={40}
                                    highlightColor={'#d8d8d8'}
                                    highlightBorderWidth={2}
                                    activeItemColor={'#222121'}
                                    itemColor={'#B4B4B4'}
                                />
                                <ScrollPicker
                                    dataSource={centsData}
                                    itemTextStyle={{fontFamily: 'Poppins_500Medium'}}
                                    wrapperHeight={120}
                                    selectedIndex={selectedDieselCents}
                                    onValueChange={(val, index) => updatePrice(selectedDieselEuros, val, setSelectedDieselEuros, setSelectedDieselCents)}
                                    wrapperBackground={'#FFFFFF'}
                                    itemHeight={40}
                                    highlightColor={'#d8d8d8'}
                                    highlightBorderWidth={2}
                                    activeItemColor={'#222121'}
                                    itemColor={'#B4B4B4'}
                                />
                            </View>
                        </Card>
                    </CardContainer>
                    <ButtonContainer style={{width: "auto", position: "relative"}}>
                        <ButtonButton icon="plus" color="#6BFF91" text="Update" onPress={handleUpdatePress}/>
                    </ButtonContainer>
                </ModalContent>
            </View>
        </Modal>
    </View>);
}

const styles = StyleSheet.create({
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        elevation: 5,
    },
    handleBar: {
        height: 5,
        width: 40,
        backgroundColor: 'gray',
        alignSelf: 'center',
        marginTop: 8,
        borderRadius: 2,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    upcomingDirectionContainer: {
        position: "absolute",
        top: 50,
        left: 0,
        right: 0,
        backgroundColor: "white",
        padding: 16,
        margin: 16,
        borderRadius: 10,
        elevation: 5,
    },
    pickerRow: {
        width: "100%",
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
});


export default MapScreen;