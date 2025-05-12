// app/(tabs)/CreateScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Image,
  StatusBar,
  ActionSheetIOS,
} from 'react-native';

import Inputs from '@/components/Inputs';
import { Ionicons } from '@expo/vector-icons';
import Buttons from '@/components/Buttons';
import { Stack } from 'expo-router';
import * as Location from 'expo-location';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '@/utils/env';
import * as FileSystem from 'expo-file-system';

import { useTheme } from '@/context/ThemeContex';

export default function CreateScreen() {
  const { theme } = useTheme();
  const styles = dynamicStyles(theme);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [postText, setPostText] = useState('');
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [placeName, setPlaceName] = useState<string | null>(null);

  // Camera states
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Create a ref for the camera
  const cameraRef = useRef<any>(null);

  // Add state for topics and user ID
  const [topics, setTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add this state for iOS picker
  const [selectedTopicName, setSelectedTopicName] = useState('Select a topic');

  // Get user ID on component mount
  useEffect(() => {
    const getUserId = async () => {
      const storedUserId = await AsyncStorage.getItem('userId');
      setUserId(storedUserId);
    };

    getUserId();
  }, []);

  // Fetch available topics on component mount
  useEffect(() => {
    fetchTopics();
  }, []);

  // Add this effect to update the topic name when ID changes
  useEffect(() => {
    if (selectedTopicId && topics.length > 0) {
      const selectedTopic = topics.find(
        (t) => t.id.toString() === selectedTopicId,
      );
      if (selectedTopic) {
        setSelectedTopicName(selectedTopic.name);
      }
    }
  }, [selectedTopicId, topics]);

  // Function to fetch topics from the backend
  const fetchTopics = async () => {
    try {
      const response = await fetch('http://10.0.2.2:8080/topics');
      const result = await response.json();

      if (response.ok && result.data) {
        setTopics(result.data);
        // Set default selected topic to the first one if available
        if (result.data.length > 0) {
          setSelectedTopicId(result.data[0].id.toString());
        }
      } else {
        console.error('Error fetching topics:', result.error);
        Alert.alert('Error', 'Could not load topics. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
      Alert.alert('Error', 'Could not connect to the server.');
    }
  };

  // Function to handle post submission
  const handlePostSubmission = async () => {
    if (!postText.trim()) {
      Alert.alert('Error', 'Please enter some text for your post.');
      return;
    }

    if (!selectedTopicId) {
      Alert.alert('Error', 'Please select a topic for your post.');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'You must be logged in to create a post.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Base post data
      let postData: any = {
        user_id: userId,
        topic_id: selectedTopicId,
        content: postText,
        location: placeName || null,
      };

      // If we have an image, convert it to base64
      if (capturedImage) {
        try {
          console.log('Converting image to base64:', capturedImage);

          // Read the file as base64
          const base64Image = await FileSystem.readAsStringAsync(
            capturedImage,
            {
              encoding: FileSystem.EncodingType.Base64,
            },
          );

          // Add the base64 image to the post data
          postData.image_data = base64Image;

          console.log('Image converted to base64 successfully');
        } catch (error) {
          console.error('Error converting image to base64:', error);
          Alert.alert(
            'Error',
            'Failed to process the image. Please try again.',
          );
          setIsSubmitting(false);
          return;
        }
      }

      console.log(
        'Submitting post data with' + (capturedImage ? ' image' : 'out image'),
      );

      // Send post data to server
      const response = await fetch('http://10.0.2.2:8080/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Post created successfully!');
        // Reset form
        setPostText('');
        setCapturedImage(null);
        setPlaceName(null);
        setLocation(null);
      } else {
        Alert.alert('Error', result.error || 'Failed to create post.');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Could not connect to the server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Location function
  async function getCurrentLocation() {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Permission to access location was denied');
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    setLocation(location);

    const place = await getPlaceName(
      location.coords.latitude,
      location.coords.longitude,
    );
    setPlaceName(place);
  }

  // Get place name from coordinates
  async function getPlaceName(latitude: number, longitude: number) {
    try {
      const geocodedLocation = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (geocodedLocation && geocodedLocation.length > 0) {
        const place = geocodedLocation[0];
        return place.city + ', ' + place.country;
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  // Handle camera icon press - request permission if needed
  const handleCameraPress = async () => {
    if (!permission?.granted) {
      const permissionResult = await requestPermission();
      if (!permissionResult.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access to take pictures for your post.',
          [{ text: 'OK' }],
        );
        return;
      }
    }
    setCameraVisible(true);
  };

  // Update your handleGalleryPress function
  const handleGalleryPress = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        'Gallery Permission Required',
        'Please allow access to your gallery to select photos.',
        [{ text: 'OK' }],
      );
      return;
    }

    // Open gallery with quality set to 0.5 (50%)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5, // Set lower quality (0-1)
    });

    if (!result.canceled) {
      setCapturedImage(result.assets[0].uri);
    }
  };

  // Handle camera flip
  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  // Also update your camera code to use lower quality
  const takePicture = async () => {
    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5, // Lower quality
          skipProcessing: false, // Allow processing for better compression
        });
        setCapturedImage(photo.uri);
        setCameraVisible(false);
      }
    } catch (error) {
      console.error('Failed to take picture:', error);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground
        source={theme.colors.background} // Исправлено на изображение
        resizeMode="cover"
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.headerText}>Create a New Post</Text>

            {/* Image preview if one is captured */}
            {capturedImage && (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: capturedImage }}
                  style={styles.imagePreview}
                  onLoad={() => console.log('Image loaded successfully')}
                  onError={(e) =>
                    console.error('Image load error:', e.nativeEvent.error)
                  }
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setCapturedImage(null)}
                >
                  <Ionicons name="close-circle" size={24} color="white" />
                </TouchableOpacity>
              </View>
            )}

            {/* Text Input Area */}
            <View style={styles.inputContainer}>
              <Inputs
                placeholder={placeName || "What's on your mind?"}
                isPassword={false}
                value={postText}
                onChangeText={setPostText}
              />
            </View>

            {/* Row with icons and button */}
            <View style={styles.actionsRow}>
              {/* Media icons */}
              <View style={styles.iconsContainer}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handleCameraPress}
                >
                  <Ionicons
                    name={capturedImage ? 'camera' : 'camera-outline'}
                    size={28}
                    color={capturedImage ? '#4CAF50' : theme.colors.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handleGalleryPress} // Добавляем обработчик для галереи
                >
                  <Ionicons
                    name={capturedImage ? 'image' : 'image-outline'} // Обновляем иконку при выборе
                    size={28}
                    color={capturedImage ? '#4CAF50' : theme.colors.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={getCurrentLocation}
                >
                  <Ionicons
                    name={placeName ? 'location' : 'location-outline'}
                    size={28}
                    color={placeName ? '#4CAF50' : theme.colors.primary}
                  />
                </TouchableOpacity>
              </View>

              {/* Post button */}
              <View style={styles.buttonContainer}>
                <Buttons
                  title={isSubmitting ? 'Posting...' : 'Post'}
                  onPress={handlePostSubmission}
                />
              </View>
            </View>

            {/* Category Selection */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Select Topic:</Text>

              {Platform.OS === 'ios' ? (
                // iOS-specific implementation
                <TouchableOpacity
                  style={styles.iosPickerButton}
                  onPress={() => {
                    if (topics.length > 0) {
                      // Create options for ActionSheet
                      const options = topics.map((topic) => topic.name);
                      options.push('Cancel');

                      ActionSheetIOS.showActionSheetWithOptions(
                        {
                          options,
                          cancelButtonIndex: options.length - 1,
                          title: 'Select a Topic',
                        },
                        (buttonIndex) => {
                          if (buttonIndex !== options.length - 1) {
                            // Not cancel
                            setSelectedTopicId(
                              topics[buttonIndex].id.toString(),
                            );
                            setSelectedTopicName(topics[buttonIndex].name);
                          }
                        },
                      );
                    }
                  }}
                >
                  <Text style={styles.iosPickerButtonText}>
                    {selectedTopicName}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={theme.colors.text}
                  />
                </TouchableOpacity>
              ) : (
                // Android implementation (unchanged)
                <View style={styles.pickerWrapper}>
                  {topics.length > 0 ? (
                    <Picker
                      selectedValue={selectedTopicId}
                      onValueChange={(itemValue) =>
                        setSelectedTopicId(itemValue)
                      }
                      style={styles.picker}
                      dropdownIconColor={theme.colors.text}
                    >
                      {topics.map((topic) => (
                        <Picker.Item
                          key={topic.id}
                          label={topic.name}
                          value={topic.id.toString()}
                          color={theme.colors.text}
                        />
                      ))}
                    </Picker>
                  ) : (
                    <Text style={styles.loadingText}>Loading topics...</Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* Camera Modal */}
        {cameraVisible && (
          <Modal
            animationType="slide"
            transparent={false}
            visible={cameraVisible}
            onRequestClose={() => setCameraVisible(false)}
          >
            <View style={styles.cameraContainer}>
              <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
                <View style={styles.cameraControlsContainer}>
                  <TouchableOpacity
                    style={styles.cameraButton}
                    onPress={() => setCameraVisible(false)}
                  >
                    <Ionicons name="close" size={30} color="white" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.captureButtonContainer}
                    onPress={takePicture}
                  >
                    <View style={styles.captureButton} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cameraButton}
                    onPress={toggleCameraFacing}
                  >
                    <Ionicons name="camera-reverse" size={30} color="white" />
                  </TouchableOpacity>
                </View>
              </CameraView>
            </View>
          </Modal>
        )}
      </ImageBackground>
    </>
  );
}

const dynamicStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
      paddingTop: StatusBar.currentHeight || 10,
    },
    scrollContent: {
      padding: 20,
      alignItems: 'center',
    },
    headerText: {
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 20,
      color: theme.colors.text,
      alignSelf: 'flex-start',
    },
    inputContainer: {
      width: 300,
      marginBottom: 20,
    },
    textInput: {
      height: 170,
      textAlignVertical: 'top',
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: 300,
      marginBottom: 20,
    },
    iconsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconButton: {
      marginRight: 15,
      padding: 5,
    },
    buttonContainer: {
      alignSelf: 'flex-end',
    },
    pickerContainer: {
      width: 300,
      marginBottom: 20,
    },
    pickerLabel: {
      fontSize: 16,
      marginBottom: 8,
      color: theme.colors.text,
      alignSelf: 'flex-start',
    },
    pickerWrapper: {
      borderWidth: 1,
      borderColor: theme.colors.border || '#ccc',
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.colors.primary || '#f9f9f9',
    },
    picker: {
      width: '100%',
      height: 50,
      color: theme.colors.text,
    },
    loadingText: {
      padding: 15,
      color: theme.colors.text,
    },
    // Camera styles
    cameraContainer: {
      flex: 1,
      backgroundColor: 'black',
    },
    camera: {
      flex: 1,
    },
    cameraControlsContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingBottom: 30,
      paddingHorizontal: 20,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    cameraButton: {
      padding: 15,
    },
    captureButtonContainer: {
      width: 70,
      height: 70,
      borderRadius: 35,
      borderWidth: 4,
      borderColor: 'white',
      justifyContent: 'center',
      alignItems: 'center',
    },
    captureButton: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: 'white',
    },
    imagePreviewContainer: {
      width: 300,
      height: 200,
      marginBottom: 20,
      borderRadius: 8,
      overflow: 'hidden',
      position: 'relative',
    },
    imagePreview: {
      width: '100%',
      height: '100%',
    },
    removeImageButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 15,
      padding: 5,
    },
    iosPickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 15,
      borderWidth: 1,
      borderColor: theme.colors.border || '#ccc',
      borderRadius: 8,
      backgroundColor: theme.colors.primary || '#f9f9f9',
    },
    iosPickerButtonText: {
      color: theme.colors.text,
    },
  });
