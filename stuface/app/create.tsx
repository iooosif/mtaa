import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { useTheme } from "@/context/ThemeContex";
import Inputs from "@/components/Inputs";
import { Ionicons } from "@expo/vector-icons";
import Buttons from "@/components/Buttons";
import { Stack } from "expo-router";
import * as Location from "expo-location";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";

export default function CreateScreen() {
  const { theme } = useTheme();
  const styles = dynamicStyles(theme);
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [postText, setPostText] = useState("");
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [placeName, setPlaceName] = useState<string | null>(null);

  // Camera states
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Create a ref for the camera
  const cameraRef = useRef<any>(null);

  // Location function
  async function getCurrentLocation() {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setErrorMsg("Permission to access location was denied");
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    setLocation(location);

    const place = await getPlaceName(
      location.coords.latitude,
      location.coords.longitude
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
        return place.city + ", " + place.country;
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  // Handle camera icon press - request permission if needed
  const handleCameraPress = async () => {
    // Check if we already have permission
    if (!permission?.granted) {
      // If not, request it
      const permissionResult = await requestPermission();

      if (!permissionResult.granted) {
        // Permission denied
        Alert.alert(
          "Camera Permission Required",
          "Please allow camera access to take pictures for your post.",
          [{ text: "OK" }]
        );
        return;
      }
    }

    // Permission granted, show camera
    setCameraVisible(true);
  };

  // Handle camera flip
  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  // Capture photo
  const takePicture = async () => {
    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync();
        setCapturedImage(photo.uri);
        console.log("Photo taken:", photo.uri);
        setCameraVisible(false);
      }
    } catch (error) {
      console.error("Failed to take picture:", error);
      Alert.alert("Error", "Failed to capture image. Please try again.");
    }
  };

  const categories = [
    { label: "General", value: "general" },
    { label: "Dormitory", value: "dormitory" },
    { label: "Canteen", value: "canteen" },
    { label: "Library", value: "library" },
    { label: "University", value: "university" },
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground
        source={theme.colors.background}
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
                  onLoad={() => console.log("Image loaded successfully")}
                  onError={(e) =>
                    console.error("Image load error:", e.nativeEvent.error)
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
                    name={capturedImage ? "camera" : "camera-outline"}
                    size={28}
                    color={capturedImage ? "#4CAF50" : theme.colors.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                  <Ionicons
                    name="image"
                    size={28}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={getCurrentLocation}
                >
                  <Ionicons
                    name={placeName ? "location" : "location-outline"}
                    size={28}
                    color={placeName ? "#4CAF50" : theme.colors.primary}
                  />
                </TouchableOpacity>
              </View>

              {/* Post button */}
              <View style={styles.buttonContainer}>
                <Buttons
                  title="Post"
                  onPress={() => {
                    console.log("Post content:", postText);
                    console.log("Location:", placeName);
                    console.log("Category:", selectedCategory);
                    console.log("Image:", capturedImage);
                    // Implement post submission here
                  }}
                />
              </View>
            </View>

            {/* Category Selection */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Select Category:</Text>
              <View style={styles.pickerWrapper}>
                <Text>Here will be a picker</Text>
              </View>
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
    },
    scrollContent: {
      padding: 20,
      alignItems: "center",
    },
    headerText: {
      marginTop: 40,
      fontSize: 32,
      fontWeight: "bold",
      marginBottom: 20,
      color: theme.colors.text,
      alignSelf: "flex-start",
    },
    inputContainer: {
      width: 300,
      marginBottom: 20,
    },
    textInput: {
      height: 170,
      textAlignVertical: "top",
    },
    actionsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: 300,
      marginBottom: 20,
    },
    iconsContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconButton: {
      marginRight: 15,
      padding: 5,
    },
    buttonContainer: {
      alignSelf: "flex-end",
    },
    pickerContainer: {
      width: 300,
      marginBottom: 20,
    },
    pickerLabel: {
      fontSize: 16,
      marginBottom: 8,
      color: theme.colors.text,
      alignSelf: "flex-start",
    },
    pickerWrapper: {
      borderWidth: 1,
      borderColor: theme.colors.border || "#ccc",
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: theme.colors.card || "#f9f9f9",
      padding: 10,
    },
    // Camera styles
    cameraContainer: {
      flex: 1,
      backgroundColor: "black",
    },
    camera: {
      flex: 1,
    },
    cameraControlsContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingBottom: 30,
      paddingHorizontal: 20,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    cameraButton: {
      padding: 15,
    },
    captureButtonContainer: {
      width: 70,
      height: 70,
      borderRadius: 35,
      borderWidth: 4,
      borderColor: "white",
      justifyContent: "center",
      alignItems: "center",
    },
    captureButton: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: "white",
    },
    imagePreviewContainer: {
      width: 300,
      height: 200,
      marginBottom: 20,
      borderRadius: 8,
      overflow: "hidden",
      position: "relative",
    },
    imagePreview: {
      width: "100%",
      height: "100%",
    },
    removeImageButton: {
      position: "absolute",
      top: 10,
      right: 10,
      backgroundColor: "rgba(0,0,0,0.5)",
      borderRadius: 15,
      padding: 5,
    },
  });
